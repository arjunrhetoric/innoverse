import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getPrParams, githubError, githubFetch } from "@/lib/github";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = getPrParams(Object.fromEntries(req.nextUrl.searchParams));
    if (params instanceof NextResponse) return params;

    const diff = await githubFetch(
      `https://api.github.com/repos/${params.repoOwner}/${encodeURIComponent(params.repoName)}/pulls/${params.pullNumber}`,
      session.accessToken,
      { accept: "application/vnd.github.v3.diff" }
    );
    return new NextResponse(typeof diff === "string" ? diff : String(diff), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error: any) {
    return githubError(error, "Error fetching PR diff");
  }
}
