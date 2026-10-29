import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Problem, User } from "@innoverse/database";
import axios from "axios";
import { getGithubToken } from "@/lib/github-token";
import { testBypassEnabled } from "@/lib/flags";
import { canCreateChallenge, type Actor } from "@/lib/policy";
import { audit } from "@/lib/audit";
import { ChallengeSchema } from "@/lib/challenge-schema";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "Startup") {
      return NextResponse.json({ message: "Unauthorized: Only startups can post challenges" }, { status: 403 });
    }

    const parsed = ChallengeSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid challenge data",
          issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        },
        { status: 400 }
      );
    }
    const {
      title,
      description,
      skillsRequired,
      finalDeadline,
      contributionType,
      githubOwner,
      createGithubRepo,
      githubRepoName,
      issueNumber,
      issueLabels,
    } = parsed.data;

    if (createGithubRepo && !githubRepoName) {
      return NextResponse.json(
        { message: "Provide a repository name, or turn off “Create a private GitHub repo”." },
        { status: 400 }
      );
    }

    const deadline = new Date(finalDeadline);
    if (Number.isNaN(deadline.getTime())) {
      return NextResponse.json({ message: "Final deadline must be a valid date" }, { status: 400 });
    }
    if (deadline <= new Date()) {
      return NextResponse.json({ message: "Final deadline must be a future date" }, { status: 400 });
    }

    await connectDB();

    // Unverified startups cannot post challenges (certificate integrity).
    const startup = (await User.findById(session.user.id).select("isVerified").lean()) as any;
    const actor: Actor = {
      id: session.user.id,
      role: session.user.role as Actor["role"],
      isVerified: Boolean(startup?.isVerified) || testBypassEnabled(),
    };
    const decision = canCreateChallenge(actor);
    if (!decision.allowed) {
      return NextResponse.json({ message: decision.reason }, { status: 403 });
    }

    const isIssue = contributionType === "issue";
    const githubAccessToken = await getGithubToken(session.user.id);

    let repoUrl: string | null = null;
    let repoOwner: string | null = null;
    let repoName: string | null = null;
    let issueNumberValue: number | null = null;
    let issueUrl: string | null = null;
    let labels: string[] = [];

    if (isIssue) {
      if (!githubAccessToken) {
        return NextResponse.json(
          { message: "GitHub authorization expired. Please sign in again." },
          { status: 401 }
        );
      }
      repoOwner = githubOwner ?? null;
      repoName = githubRepoName ?? null;
      if (!repoOwner || !repoName) {
        return NextResponse.json(
          { message: "Repository owner and name are required for an issue" },
          { status: 400 }
        );
      }

      const headers = {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      };

      try {
        const repoResponse = await axios.get(
          `https://api.github.com/repos/${repoOwner}/${repoName}`,
          { headers }
        );
        repoUrl = repoResponse.data.html_url;
      } catch (error: any) {
        return NextResponse.json(
          {
            message:
              "Repository not found or not accessible with your GitHub account. Check the owner and name.",
          },
          { status: 404 }
        );
      }

      const existingNumber = issueNumber ? Number(issueNumber) : null;
      if (existingNumber && Number.isInteger(existingNumber) && existingNumber > 0) {
        try {
          const issueResponse = await axios.get(
            `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${existingNumber}`,
            { headers }
          );
          issueNumberValue = issueResponse.data.number;
          issueUrl = issueResponse.data.html_url;
          labels = (issueResponse.data.labels ?? []).map((l: any) =>
            typeof l === "string" ? l : l.name
          );
        } catch {
          return NextResponse.json(
            { message: `Issue #${existingNumber} was not found in ${repoOwner}/${repoName}` },
            { status: 404 }
          );
        }
      } else {
        try {
          const created = await axios.post(
            `https://api.github.com/repos/${repoOwner}/${repoName}/issues`,
            {
              title,
              body: description,
              labels: issueLabels ?? [],
            },
            { headers }
          );
          issueNumberValue = created.data.number;
          issueUrl = created.data.html_url;
          labels = (created.data.labels ?? []).map((l: any) =>
            typeof l === "string" ? l : l.name
          );
        } catch (error: any) {
          console.error(
            "GitHub issue creation failed:",
            error.response?.data || error.message
          );
          return NextResponse.json(
            {
              message:
                "Could not create the GitHub issue. Check that your account can open issues on this repository.",
            },
            { status: 502 }
          );
        }
      }
    } else if (createGithubRepo && githubRepoName) {
      if (!githubAccessToken) {
        return NextResponse.json(
          { message: "GitHub authorization expired. Please sign in again to create a repository." },
          { status: 401 }
        );
      }
      try {
        const githubUsername = session.user.githubUsername;
        const response = await axios.post(
          "https://api.github.com/user/repos",
          { name: githubRepoName, private: true, auto_init: true },
          { headers: { Authorization: `Bearer ${githubAccessToken}` } }
        );

        repoUrl = response.data.html_url ?? repoUrl;
        repoOwner = response.data.owner?.login ?? githubUsername ?? null;
        repoName = response.data.name ?? githubRepoName;

        await User.findByIdAndUpdate(session.user.id, { githubRepoName: githubRepoName });
      } catch (error: any) {
        console.error("GitHub Repo Creation Error:", error.response?.data || error.message);
        return NextResponse.json({ message: "Failed to create GitHub repository" }, { status: 500 });
      }
    }

    const problem = await Problem.create({
      title,
      description,
      skillsRequired,
      finalDeadline,
      createdBy: session.user.id,
      contributionType: isIssue ? "issue" : "project",
      githubRepoName: repoName,
      githubRepoUrl: repoUrl,
      githubOwner: repoOwner,
      githubIssueNumber: issueNumberValue,
      githubIssueUrl: issueUrl,
      labels,
    });

    await audit({
      actorId: actor.id,
      actorName: session.user.name ?? null,
      action: "challenge.created",
      resourceType: "Problem",
      resourceId: String(problem._id),
      metadata: {
        title: problem.title,
        githubRepo: problem.githubRepoName ?? null,
      },
      request: req,
    });

    return NextResponse.json({ message: "Problem Statement posted successfully", problem }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: "Error posting problem statement", error: error.message }, { status: 500 });
  }
}
