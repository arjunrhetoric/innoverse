import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getGithubToken } from "@/lib/github-token";
import { getPrParams, githubError, githubFetch } from "@/lib/github";
import { requireRepoRole } from "@/lib/repo-access";
import { emitPr } from "@/lib/realtime";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
          return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
    
        const accessToken = await getGithubToken(session.user.id);
        if (!accessToken) {
          return NextResponse.json({ message: "GitHub authorization expired. Please sign in again." }, { status: 401 });
        }

    const body = await req.json();
    const params = getPrParams({
      repoOwner: body?.repoOwner,
      repoName: body?.repoName,
      pullNumber: String(body?.pullNumber ?? ""),
    });
    if (params instanceof NextResponse) return params;

    const access = await requireRepoRole(
      params.repoOwner,
      params.repoName,
      session.user.id,
      "maintainer"
    );
    if (access instanceof NextResponse) return access;

    const data = await githubFetch(
      `https://api.github.com/repos/${params.repoOwner}/${encodeURIComponent(params.repoName)}/pulls/${params.pullNumber}/merge`,
      accessToken,
      { method: "PUT", data: {} }
    );

    // Each merged PR adds 20% progress, capped at 100, on the matching challenge.
    try {
      const { Problem } = await import("@innoverse/database");
      const project = (await Problem.findOne({
        _id: { $in: access.problems.map((p: any) => p._id) },
      })) as any;
      if (project) {
        project.progress = Math.min((project.progress || 0) + 20, 100);
        await project.save();
      }
    } catch (err) {
      console.error("Failed to update project progress after merge:", err);
    }

    // If a submitted milestone points at this PR, merging completes it.
    // Engagement milestones with this PR as evidence move to Delivered.
    try {
      const { Engagement, Milestone } = await import("@innoverse/database");
      const { emitMilestone } = await import("@/lib/realtime");
      const problemIds = access.problems.map((p: any) => p._id);
      const pullPattern = new RegExp(`/pull/${params.pullNumber}(?:[/?#]|$)`);

      const milestones = (await Milestone.find({
        $or: [
          { problemId: { $in: problemIds } },
          { repoOwner: params.repoOwner, repoName: params.repoName },
        ],
        completed: false,
        submittedAt: { $ne: null },
      })) as any[];

      let completedCount = 0;
      for (const milestone of milestones) {
        if (!pullPattern.test(milestone.evidenceUrl ?? "")) continue;
        milestone.completed = true;
        milestone.completedAt = new Date();
        milestone.reviewNote = null;
        await milestone.save();
        completedCount += 1;
        void emitMilestone(milestone.toObject?.() ?? milestone, "completed", {
          id: session.user.id,
          name: session.user.name,
        });
      }

      const engagements = (await Engagement.find({
        problemId: { $in: problemIds },
        status: "Active",
      })) as any[];
      let deliveredCount = 0;

      for (const engagement of engagements) {
        let changed = false;
        for (const milestone of engagement.milestones) {
          if (
            milestone.status === "Pending" &&
            pullPattern.test(milestone.evidenceUrl ?? "")
          ) {
            milestone.status = "Delivered";
            milestone.deliveredAt = new Date();
            changed = true;
            deliveredCount += 1;
          }
        }
        if (changed) await engagement.save();
      }

      if (completedCount || deliveredCount) {
        console.log(
          `PR merge linked: ${completedCount} milestone(s) completed, ${deliveredCount} engagement milestone(s) delivered`
        );
      }
    } catch (err) {
      console.error("Failed to link the merged PR to milestones:", err);
    }

    void emitPr(params.repoOwner, params.repoName, params.pullNumber, {
      action: "merge",
      actorId: session.user.id,
      actorName: session.user.name,
    });
    return NextResponse.json({ message: "Pull Request merged successfully", data });
  } catch (error: any) {
    return githubError(error, "Error merging PR");
  }
}
