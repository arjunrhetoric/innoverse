import crypto from "crypto";

/**
 * GitHub App authentication.
 *
 * A GitHub App replaces the broad OAuth `repo` scope with short-lived,
 * per-installation tokens (1 hour) that only cover the repositories the app
 * was installed on.
 *
 * Dormant until GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY are set; callers fall
 * back to the user's OAuth token in that case, so behaviour is unchanged.
 */

const API = "https://api.github.com";
const CACHE_TTL_MS = 50 * 60 * 1000;

interface CachedToken {
  token: string;
  expiresAt: number;
}

const g = globalThis as unknown as {
  __innoverseInstallationTokens?: Map<string, CachedToken>;
};

const cache =
  g.__innoverseInstallationTokens ?? new Map<string, CachedToken>();
g.__innoverseInstallationTokens = cache;

function appId(): string | null {
  return process.env.GITHUB_APP_ID?.trim() || null;
}

function privateKey(): string | null {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!raw) return null;
  // Vercel env vars often store newlines as literal \n.
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

export function isGithubAppConfigured(): boolean {
  return Boolean(appId() && privateKey());
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

/** Signed RS256 JWT that authenticates the app itself (max 10 minutes). */
export function createAppJwt(nowMs = Date.now()): string {
  const id = appId();
  const key = privateKey();
  if (!id || !key) {
    throw new Error("GitHub App is not configured");
  }

  const issuedAt = Math.floor(nowMs / 1000) - 60;
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({ iat: issuedAt, exp: issuedAt + 600, iss: Number(id) })
  );
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = signer.sign(key).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

async function appRequest(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${createAppJwt()}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub App request failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function installationIdFor(owner: string, repo?: string): Promise<number | null> {
  const paths = repo
    ? [`/repos/${owner}/${repo}/installation`]
    : [`/users/${owner}/installation`, `/orgs/${owner}/installation`];

  for (const path of paths) {
    try {
      const data: any = await appRequest(path);
      if (data?.id) return Number(data.id);
    } catch {
      // Try the next form (user vs org) or fall through to "not installed".
    }
  }
  return null;
}

/**
 * Installation token for an owner (optionally scoped to a repo).
 * Returns null when the app isn't configured or isn't installed there.
 */
export async function getInstallationToken(
  owner: string,
  repo?: string
): Promise<string | null> {
  if (!isGithubAppConfigured()) return null;

  const cacheKey = repo ? `${owner}/${repo}` : owner;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const installationId = await installationIdFor(owner, repo);
  if (!installationId) return null;

  try {
    const data: any = await appRequest(`/app/installations/${installationId}/access_tokens`, {
      method: "POST",
    });
    if (!data?.token) return null;
    cache.set(cacheKey, { token: data.token, expiresAt: Date.now() + CACHE_TTL_MS });
    return data.token;
  } catch (err) {
    console.error("GitHub App installation token failed:", err);
    return null;
  }
}

/**
 * Token to use for repository operations.
 * Prefers a GitHub App installation token; falls back to the user's token.
 */
export async function getRepoToken(
  owner: string,
  repo: string,
  userToken: string | null
): Promise<string | null> {
  if (isGithubAppConfigured()) {
    const appToken = await getInstallationToken(owner, repo);
    if (appToken) return appToken;
  }
  return userToken;
}

/** Clear cached tokens (tests / key rotation). */
export function clearInstallationTokenCache() {
  cache.clear();
}
