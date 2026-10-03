import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getPrParams, githubError, githubFetch } from "@/lib/github";
import { requireRepoRole } from "@/lib/repo-access";
import { emitPr } from "@/lib/realtime";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
      session.accessToken,
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
