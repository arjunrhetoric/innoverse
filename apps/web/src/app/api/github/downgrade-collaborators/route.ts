import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Problem, Proposal } from "@innoverse/database";
import { getGithubToken } from "@/lib/github-token";
import { audit } from "@/lib/audit";
import axios from "axios";

export const dynamic = "force-dynamic";

/**
 * One-time remediation: older approvals granted students `push` access.
 * This walks the startup's challenges and downgrades approved contributors
 * to read-only (`pull`).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "Startup") {
      return NextResponse.json({ message: "Only startups can run this" }, { status: 403 });
    }

    const token = await getGithubToken(session.user.id);
    if (!token) {
      return NextResponse.json(
        { message: "GitHub authorization expired. Please sign in again." },
        { status: 401 }
      );
    }

    await connectDB();

    const problems = (await Problem.find({
      createdBy: session.user.id,
      githubOwner: { $ne: null },
      githubRepoName: { $ne: null },
    })
      .select("_id title githubOwner githubRepoName")
      .lean()) as any[];

    const result = {
      repositories: problems.length,
      checked: 0,
      downgraded: 0,
      skipped: 0,
      failed: [] as Array<{ repo: string; student: string; status: number | null; message: string }>,
    };

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    };

    for (const problem of problems) {
      const proposals = (await Proposal.find({
        problemId: problem._id,
        status: "Approved",
      })
        .populate("studentId", "name githubUsername")
        .lean()) as any[];

      const seen = new Set<string>();

      for (const proposal of proposals) {
        const username = proposal.studentId?.githubUsername;
        if (!username || seen.has(username.toLowerCase())) continue;
        seen.add(username.toLowerCase());
        result.checked += 1;

        const repo = `${problem.githubOwner}/${problem.githubRepoName}`;

        try {
          await axios.put(
            `https://api.github.com/repos/${problem.githubOwner}/${encodeURIComponent(problem.githubRepoName)}/collaborators/${encodeURIComponent(username)}`,
            { permission: "pull" },
            { headers }
          );
          result.downgraded += 1;
        } catch (error: any) {
          const status = error.response?.status ?? null;
          if (status === 422) {
            // Already read-only, already invited, or the repo owner.
            result.skipped += 1;
          } else {
            result.failed.push({
              repo,
              student: username,
              status,
              message: error.response?.data?.message ?? error.message,
            });
          }
        }
      }
    }

    await audit({
      actorId: session.user.id,
      actorName: session.user.name ?? null,
      action: "access.downgraded",
      resourceType: "User",
      resourceId: session.user.id,
      metadata: {
        repositories: result.repositories,
        checked: result.checked,
        downgraded: result.downgraded,
        failed: result.failed.length,
      },
      request: req,
    });

    return NextResponse.json({
      message:
        result.failed.length === 0
          ? "All approved contributors now have read-only access."
          : "Downgrade finished with some failures.",
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
