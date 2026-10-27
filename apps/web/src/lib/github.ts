import { NextResponse } from "next/server";
import axios from "axios";
import { getInstallationToken, isGithubAppConfigured } from "./github-app";

/**
 * Extract owner/repo from a GitHub API URL, e.g.
 * https://api.github.com/repos/acme/app/pulls/1
 */
export function repoFromGithubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/^https:\/\/api\.github\.com\/repos\/([^/]+)\/([^/?#]+)(?:[/?#]|$)/);
  if (!match) return null;
  try {
    return {
      owner: decodeURIComponent(match[1]),
      repo: decodeURIComponent(match[2]),
    };
  } catch {
    return null;
  }
}

/**
 * Prefer a GitHub App installation token (short-lived, repo-scoped) for
 * repository operations. Falls back to the caller's OAuth token, so this is
 * a no-op until the app is configured and installed.
 */
async function resolveToken(url: string, fallbackToken: string): Promise<string> {
  if (!isGithubAppConfigured()) return fallbackToken;
  const target = repoFromGithubUrl(url);
  if (!target) return fallbackToken;

  const appToken = await getInstallationToken(target.owner, target.repo);
  return appToken ?? fallbackToken;
}

export interface PrParams {
  repoOwner: string;
  repoName: string;
  pullNumber: string;
}

export function getPrParams(
  input: Record<string, string | null | undefined>
): PrParams | NextResponse {
  const repoOwner = input.repoOwner?.trim() ?? "";
  const repoName = input.repoName?.trim() ?? "";
  const pullNumber = input.pullNumber?.trim() ?? "";

  if (!repoOwner || !repoName || !pullNumber) {
    return NextResponse.json(
      { message: "repoOwner, repoName, and pullNumber are required" },
      { status: 400 }
    );
  }

  if (!/^\d+$/.test(pullNumber)) {
    return NextResponse.json(
      { message: "pullNumber must be a number" },
      { status: 400 }
    );
  }

  return { repoOwner, repoName, pullNumber };
}

export function githubHeaders(token: string, accept = "application/vnd.github+json") {
  return {
    Authorization: `Bearer ${token}`,
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export function githubError(error: any, fallback: string) {
  const status = error?.response?.status ?? 500;
  const data = error?.response?.data;
  const message =
    (typeof data?.message === "string" && data.message) ||
    error?.message ||
    fallback;
  return NextResponse.json(
    { message, ...(data ? { error: data } : {}) },
    { status: status >= 400 && status < 600 ? status : 500 }
  );
}

export async function githubFetch(
  url: string,
  token: string,
  options?: { method?: string; data?: unknown; accept?: string }
) {
  const effectiveToken = await resolveToken(url, token);
  const response = await axios({
    method: options?.method ?? "GET",
    url,
    headers: githubHeaders(effectiveToken, options?.accept),
    ...(options?.data !== undefined ? { data: options.data } : {}),
  });
  return response.data;
}
