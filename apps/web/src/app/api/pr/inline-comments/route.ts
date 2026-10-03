import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getPrParams, githubError, githubFetch } from "@/lib/github";
import { requireRepoRole } from "@/lib/repo-access";
import { emitPr } from "@/lib/realtime";

/** List real GitHub review (inline) comments on a PR. */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = getPrParams(Object.fromEntries(req.nextUrl.searchParams));
    if (params instanceof NextResponse) return params;

    const data = await githubFetch(
      `https://api.github.com/repos/${params.repoOwner}/${encodeURIComponent(params.repoName)}/pulls/${params.pullNumber}/comments?per_page=100`,
      session.accessToken
    );
    return NextResponse.json(data);
  } catch (error: any) {
    return githubError(error, "Error fetching inline comments");
  }
}

/**
 * Post a real GitHub inline comment. Body: { path, line, side?, body,
 * commitId?, inReplyTo? }. Replies only need { inReplyTo, body }.
 */
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

    const text = body?.body;
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ message: "body is required" }, { status: 400 });
    }

    const access = await requireRepoRole(
      params.repoOwner,
      params.repoName,
      session.user.id,
      "participant"
    );
    if (access instanceof NextResponse) return access;

    const base = `https://api.github.com/repos/${params.repoOwner}/${encodeURIComponent(params.repoName)}/pulls/${params.pullNumber}/comments`;

    // Reply to an existing inline thread.
    if (body?.inReplyTo) {
      const data = await githubFetch(base, session.accessToken, {
        method: "POST",
        data: { body: text, in_reply_to: Number(body.inReplyTo) },
      });
    void emitPr(params.repoOwner, params.repoName, params.pullNumber, {
      action: "inline-reply",
      actorId: session.user.id,
      actorName: session.user.name,
    });
    return NextResponse.json({ message: "Reply posted", comment: data });
    }

    const path = body?.path;
    const line = Number(body?.line);
    if (typeof path !== "string" || !path || !Number.isInteger(line) || line < 1) {
      return NextResponse.json(
        { message: "path and a positive integer line are required" },
        { status: 400 }
      );
    }

    const side = String(body?.side ?? "RIGHT").toUpperCase();
    if (side !== "LEFT" && side !== "RIGHT") {
      return NextResponse.json(
        { message: "side must be LEFT or RIGHT" },
        { status: 400 }
      );
    }

    // Resolve the commit to anchor the comment when the client doesn't send one.
    let commitId = body?.commitId;
    if (!commitId) {
      const details: any = await githubFetch(
        `https://api.github.com/repos/${params.repoOwner}/${encodeURIComponent(params.repoName)}/pulls/${params.pullNumber}`,
        session.accessToken
      );
      commitId = details?.head?.sha;
    }
    if (!commitId) {
      return NextResponse.json(
        { message: "Could not resolve the PR head commit; pass commitId explicitly" },
        { status: 400 }
      );
    }

    const data = await githubFetch(base, session.accessToken, {
      method: "POST",
      data: { body: text, commit_id: commitId, path, line, side },
    });
    void emitPr(params.repoOwner, params.repoName, params.pullNumber, {
      action: "inline-comment",
      actorId: session.user.id,
      actorName: session.user.name,
    });
    return NextResponse.json({ message: "Inline comment posted", comment: data });
  } catch (error: any) {
    return githubError(error, "Error posting inline comment");
  }
}
