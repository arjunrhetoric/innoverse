import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Problem, User } from "@innoverse/database";
import axios from "axios";
import { getGithubToken } from "@/lib/github-token";
import { testBypassEnabled } from "@/lib/flags";
import { z } from "zod";

const ProblemSchema = z.object({
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(20).max(5000),
  skillsRequired: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  finalDeadline: z.string().min(1),
  createGithubRepo: z.boolean().optional(),
  githubRepoName: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._-]{1,100}$/)
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "Startup") {
      return NextResponse.json({ message: "Unauthorized: Only startups can post challenges" }, { status: 403 });
    }

    const parsed = ProblemSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid challenge data", issues: parsed.error.issues.map((i) => i.message) },
        { status: 400 }
      );
    }
    const { title, description, skillsRequired, finalDeadline, createGithubRepo, githubRepoName } = parsed.data;

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
    if (!startup?.isVerified && !testBypassEnabled()) {
      return NextResponse.json(
        { message: "Verify your startup with a business email before posting challenges" },
        { status: 403 }
      );
    }

    let repoUrl = null;
    let githubOwner = null;

    const githubAccessToken = await getGithubToken(session.user.id);
    if (createGithubRepo && githubRepoName) {
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

        repoUrl = response.data.html_url;
        githubOwner = githubUsername;

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
      githubRepoName: createGithubRepo ? githubRepoName : null,
      githubRepoUrl: repoUrl,
      githubOwner: githubOwner,
    });

    return NextResponse.json({ message: "Problem Statement posted successfully", problem }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: "Error posting problem statement", error: error.message }, { status: 500 });
  }
}
