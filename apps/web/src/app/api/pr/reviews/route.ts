import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getPrParams, githubError, githubFetch } from "@/lib/github";
import { requireRepoRole } from "@/lib/repo-access";
import { emitPr } from "@/lib/realtime";

const REVIEW_EVENTS = ["APPROVE", "REQUEST_CHANGES", "COMMENT"] as const;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = getPrParams(Object.fromEntries(req.nextUrl.searchParams));
    if (params instanceof NextResponse) return params;

    const data = await githubFetch(
      `https://api.github.com/repos/${params.repoOwner}/${encodeURIComponent(params.repoName)}/pulls/${params.pullNumber}/reviews?per_page=100`,
      session.accessToken
    );
    return NextResponse.json(data);
  } catch (error: any) {
    return githubError(error, "Error fetching PR reviews");
  }
}

/** Submit a review: APPROVE / REQUEST_CHANGES (maintainer) or COMMENT (participant). */
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

    const event = String(body?.event ?? "").toUpperCase();
    if (!(REVIEW_EVENTS as readonly string[]).includes(event)) {
      return NextResponse.json(
        { message: "event must be APPROVE, REQUEST_CHANGES, or COMMENT" },
        { status: 400 }
      );
    }

    const reviewBody = typeof body?.body === "string" ? body.body : "";
    if (event === "REQUEST_CHANGES" && !reviewBody.trim()) {
      return NextResponse.json(
        { message: "A comment is required when requesting changes" },
        { status: 400 }
      );
    }

    const access = await requireRepoRole(
      params.repoOwner,
      params.repoName,
      session.user.id,
      event === "COMMENT" ? "participant" : "maintainer"
    );
    if (access instanceof NextResponse) return access;

    const data = await githubFetch(
      `https://api.github.com/repos/${params.repoOwner}/${encodeURIComponent(params.repoName)}/pulls/${params.pullNumber}/reviews`,
      session.accessToken,
      {
        method: "POST",
        data: {
          event,
          ...(reviewBody ? { body: reviewBody } : {}),
          ...(body?.commitId ? { commit_id: body.commitId } : {}),
        },
      }
    );
    void emitPr(params.repoOwner, params.repoName, params.pullNumber, {
      action: `review-${event.toLowerCase()}`,
      actorId: session.user.id,
      actorName: session.user.name,
    });
    return NextResponse.json({ message: "Review submitted successfully", review: data });
  } catch (error: any) {
    return githubError(error, "Error submitting review");
  }
}
