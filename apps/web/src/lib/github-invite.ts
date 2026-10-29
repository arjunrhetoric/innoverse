/**
 * Invite a GitHub user as a read-only collaborator.
 *
 * GitHub has a long-standing quirk on user-owned repositories: sending
 * `PUT /collaborators/{user}` with `{ "permission": "pull" }` returns
 *
 *   422 Validation Failed — Cannot assign <user> permission of read
 *
 * The same request with **no body** succeeds and creates the invitation (with
 * GitHub's default role). We therefore retry without a body and immediately
 * lower the pending invitation to Read. Org-owned repos accept the explicit
 * permission and take the normal path.
 */

export type GithubHeaders = Record<string, string>;

export type InviteResult =
  | {
      ok: true;
      invited: boolean;
      permission: string | null;
      invitationId: number | null;
      warning: string | null;
    }
  | {
      ok: false;
      status: number | null;
      message: string;
    };

function jsonHeaders(headers: GithubHeaders): GithubHeaders {
  return { ...headers, "Content-Type": "application/json" };
}

async function readJson(res: Response): Promise<any> {
  return res.json().catch(() => null);
}

function errorText(status: number, data: any): string {
  const message = typeof data?.message === "string" ? data.message : "";
  const errors = data?.errors;
  let detail = "";
  if (typeof errors === "string") {
    detail = errors;
  } else if (Array.isArray(errors)) {
    detail = errors
      .map((e: any) => (typeof e === "string" ? e : e?.message))
      .filter(Boolean)
      .join("; ");
  }
  return [message, detail].filter(Boolean).join(": ") || `HTTP ${status}`;
}

function isPermissionRefusal(status: number, message: string): boolean {
  return status === 422 && /cannot assign .* permission|permission of read/i.test(message);
}

async function currentPermission(
  base: string,
  username: string,
  headers: GithubHeaders
): Promise<string | null> {
  try {
    const res = await fetch(
      `${base}/collaborators/${encodeURIComponent(username)}/permission`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data: any = await readJson(res);
    const raw = String(data?.permission ?? "").toLowerCase();
    return raw === "read" ? "pull" : raw || null;
  } catch {
    return null;
  }
}

/** Find the pending invitation and set it to Read. */
async function setPendingInvitationRead(
  base: string,
  username: string,
  headers: GithubHeaders
): Promise<{ id: number; permission: string } | null> {
  try {
    const list = await fetch(`${base}/invitations?per_page=100`, {
      headers,
      cache: "no-store",
    });
    if (!list.ok) return null;
    const invitations: any[] = await readJson(list);
    const pending = (Array.isArray(invitations) ? invitations : []).find(
      (inv: any) => inv.invitee?.login?.toLowerCase() === username.toLowerCase()
    );
    if (!pending?.id) return null;

    const patch = await fetch(`${base}/invitations/${pending.id}`, {
      method: "PATCH",
      headers: jsonHeaders(headers),
      body: JSON.stringify({ permissions: "read" }),
    });
    if (!patch.ok) {
      const data = await readJson(patch);
      console.error(
        "Could not lower pending GitHub invitation:",
        errorText(patch.status, data)
      );
      return null;
    }
    const data: any = await readJson(patch);
    const permission = String(data?.permissions ?? "read").toLowerCase();
    return {
      id: pending.id,
      permission: permission === "read" ? "pull" : permission,
    };
  } catch (error: any) {
    console.error("Could not inspect pending GitHub invitations:", error.message);
    return null;
  }
}

export async function inviteReadOnly(
  base: string,
  username: string,
  headers: GithubHeaders
): Promise<InviteResult> {
  const path = `${base}/collaborators/${encodeURIComponent(username)}`;

  // 1. Preferred path: explicit Read. Works for org-owned repositories.
  let res: Response;
  try {
    res = await fetch(path, {
      method: "PUT",
      headers: jsonHeaders(headers),
      body: JSON.stringify({ permission: "pull" }),
    });
  } catch (error: any) {
    return { ok: false, status: null, message: error.message };
  }

  let data = await readJson(res);
  let message = errorText(res.status, data);
  let usedFallback = false;

  // 2. User-owned repo fallback: retry without a permission body.
  if (!res.ok && isPermissionRefusal(res.status, message)) {
    usedFallback = true;
    try {
      res = await fetch(path, { method: "PUT", headers });
    } catch (error: any) {
      return { ok: false, status: null, message: error.message };
    }
    data = await readJson(res);
    message = errorText(res.status, data);
  }

  if (!res.ok) {
    return { ok: false, status: res.status, message };
  }

  // 204 = already a collaborator. Verify the real permission.
  if (res.status === 204) {
    const permission = await currentPermission(base, username, headers);
    if (!permission || permission === "none") {
      return {
        ok: false,
        status: 204,
        message: "GitHub accepted the request but did not report repository access.",
      };
    }
    return {
      ok: true,
      invited: false,
      permission,
      invitationId: null,
      warning:
        permission === "pull"
          ? null
          : `GitHub kept "${permission}" access; this repository rejects an explicit Read role.`,
    };
  }

  // 201 = invitation created. If we used the no-body fallback, lower it to Read.
  const invitationId = Number(data?.id) || null;
  if (!usedFallback) {
    return {
      ok: true,
      invited: true,
      permission: "pull",
      invitationId,
      warning: null,
    };
  }

  const updated = await setPendingInvitationRead(base, username, headers);
  return {
    ok: true,
    invited: true,
    permission: updated?.permission ?? null,
    invitationId: updated?.id ?? invitationId,
    warning: updated
      ? null
      : "GitHub created the invitation but Innoverse could not lower it to Read. Accept the invite, then use Fix access to verify the collaborator role.",
  };
}
