import { connectDB, User } from "@innoverse/database";
import { decryptSecret, encryptSecret, isEncryptedSecret } from "./crypto";

interface CacheEntry {
  token: string | null;
  expiresAt: number;
}

const TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

/**
 * Resolve a user's GitHub access token server-side.
 *
 * The token is never part of the session or any client payload. Routes ask
 * this helper by user id instead.
 *
 * Also performs a lazy migration: users who still have a plaintext
 * `accessToken` from the old schema get it encrypted on first use.
 */
export async function getGithubToken(userId: string): Promise<string | null> {
  const now = Date.now();
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > now) return cached.token;

  await connectDB();

  const user = (await User.findById(userId)
    .select("githubTokenEnc accessToken")
    .lean()) as
    | { githubTokenEnc?: string | null; accessToken?: string | null }
    | null;

  let token: string | null = null;

  if (user?.githubTokenEnc) {
    try {
      token = decryptSecret(user.githubTokenEnc);
    } catch (err) {
      console.error("Failed to decrypt GitHub token; user must sign in again.", err);
      token = null;
    }
  } else if (user?.accessToken) {
    // Legacy plaintext token: adopt and encrypt it now.
    token = user.accessToken;
    try {
      await User.updateOne(
        { _id: userId },
        {
          $set: { githubTokenEnc: encryptSecret(token) },
          $unset: { accessToken: 1 },
        }
      );
    } catch (err) {
      console.error("Failed to migrate legacy GitHub token:", err);
    }
  }

  cache.set(userId, { token, expiresAt: now + TTL_MS });
  return token;
}

/** Invalidate the cached token (call after sign-in or token changes). */
export function clearGithubTokenCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

export { encryptSecret, isEncryptedSecret };
