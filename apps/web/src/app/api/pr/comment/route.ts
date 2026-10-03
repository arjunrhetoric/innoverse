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
      "participant"
    );
    if (access instanceof NextResponse) return access;

    const comment = body?.comment ?? body?.body;
    if (typeof comment !== "string" || !comment.trim()) {
      return NextResponse.json(
        { message: "comment is required" },
        { status: 400 }
      );
    }

    const data = await githubFetch(
      `https://api.github.com/repos/${params.repoOwner}/${encodeURIComponent(params.repoName)}/issues/${params.pullNumber}/comments`,
      session.accessToken,
      { method: "POST", data: { body: comment } }
    );
    void emitPr(params.repoOwner, params.repoName, params.pullNumber, {
      action: "comment",
      actorId: session.user.id,
      actorName: session.user.name,
    });
    return NextResponse.json({ message: "Comment posted successfully", comment: data });
  } catch (error: any) {
    return githubError(error, "Error posting comment");
  }
}
