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

    const data = await githubFetch(
      `https://api.github.com/repos/${params.repoOwner}/${encodeURIComponent(params.repoName)}/pulls/${params.pullNumber}/commits?per_page=100`,
      session.accessToken
    );
    return NextResponse.json(data);
  } catch (error: any) {
    return githubError(error, "Error fetching PR commits");
  }
}
