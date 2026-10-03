import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Problem, Milestone } from "@innoverse/database";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    // 1. Get the problem/project data
    const problem = (await Problem.findById(id).lean()) as any;
    if (!problem) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }

    // 2. Get milestones for this problem. Older records are keyed only by repo.
    const milestoneFilters: Record<string, unknown>[] = [{ problemId: id }];
    if (problem.githubOwner && problem.githubRepoName) {
      milestoneFilters.push({
        repoOwner: problem.githubOwner,
        repoName: problem.githubRepoName,
      });
    }
    const milestones = await Milestone.find({ $or: milestoneFilters }).sort({ deadline: 1 }).lean();

    // 3. Calculate progress based on completed milestones
    const completedCount = milestones.filter((m: any) => m.completed).length;
    const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

    // 4. Fetch pull requests from GitHub if repo info is available
    let pullRequests: any[] = [];
    if (problem.githubOwner && problem.githubRepoName && session.accessToken) {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${problem.githubOwner}/${problem.githubRepoName}/pulls?state=all&per_page=50`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );
        if (res.ok) {
          pullRequests = await res.json();
        }
      } catch (err) {
        console.error("Error fetching PRs:", err);
      }
    }

    return NextResponse.json({
      problemData: problem,
      milestones,
      pullRequests,
      progress,
    });
  } catch (error: any) {
    console.error("Project tracking error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
