import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstallationToken, isGithubAppConfigured } from "@/lib/github-app";

export const dynamic = "force-dynamic";

/**
 * Configuration check for the GitHub App. Never returns the token itself.
 * Usage: /api/github/app-status?owner=acme&repo=app
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const owner = req.nextUrl.searchParams.get("owner")?.trim() ?? "";
  const repo = req.nextUrl.searchParams.get("repo")?.trim() || undefined;

  if (!isGithubAppConfigured()) {
    return NextResponse.json({
      configured: false,
      message:
        "Set GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY; see docs/github-app-setup.md.",
    });
  }

  if (!owner) {
    return NextResponse.json({
      configured: true,
      installed: null,
      tokenAcquired: null,
      message: "Pass ?owner=<account> (and optionally &repo=<repo>) to check an installation.",
    });
  }

  try {
    const token = await getInstallationToken(owner, repo);
    return NextResponse.json({
      configured: true,
      owner,
      repo: repo ?? null,
      installed: Boolean(token),
      tokenAcquired: Boolean(token),
      message: token
        ? "Installation token acquired; repository operations will use the GitHub App."
        : "No installation found for that owner/repo; the user OAuth token will be used instead.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { configured: true, installed: false, tokenAcquired: false, message: error.message },
      { status: 500 }
    );
  }
}
