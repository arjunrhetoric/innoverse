import { NextResponse } from "next/server";
import axios from "axios";

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
  const response = await axios({
    method: options?.method ?? "GET",
    url,
    headers: githubHeaders(token, options?.accept),
    ...(options?.data !== undefined ? { data: options.data } : {}),
  });
  return response.data;
}
