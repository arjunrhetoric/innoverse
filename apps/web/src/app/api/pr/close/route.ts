import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getGithubToken } from "@/lib/github-token";
import { getPrParams, githubError, githubFetch } from "@/lib/github";
import { requireRepoRole } from "@/lib/repo-access";
import { emitPr } from "@/lib/realtime";

export async function PATCH(req: NextRequest) {
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
      `https://api.github.com/repos/${params.repoOwner}/${encodeURIComponent(params.repoName)}/pulls/${params.pullNumber}`,
      accessToken,
      { method: "PATCH", data: { state: "closed" } }
    );
    void emitPr(params.repoOwner, params.repoName, params.pullNumber, {
      action: "close",
      actorId: session.user.id,
      actorName: session.user.name,
    });
    return NextResponse.json({ message: "Pull Request closed successfully", data });
  } catch (error: any) {
    return githubError(error, "Error closing PR");
  }
}
