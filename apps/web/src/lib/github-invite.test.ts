import { afterEach, describe, expect, it, vi } from "vitest";
import { inviteReadOnly } from "./github-invite";

const BASE = "https://api.github.com/repos/o/r";
const HEADERS = {
  Authorization: "Bearer test",
  Accept: "application/vnd.github+json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("inviteReadOnly", () => {
  it("retries without a permission body on user-owned repos, then sets Read", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url);
      calls.push({ url: href, init });
      if (init?.method === "PUT" && init.body) {
        return json(
          {
            message: "Validation Failed",
            errors: "Cannot assign q permission of read",
          },
          422
        );
      }
      if (init?.method === "PUT") {
        return json({ id: 77 }, 201);
      }
      if (href.endsWith("/invitations?per_page=100")) {
        return json([{ id: 77, invitee: { login: "q" }, permissions: "write" }]);
      }
      if (href.endsWith("/invitations/77") && init?.method === "PATCH") {
        return json({ id: 77, permissions: "read" });
      }
      return json({ message: "unexpected" }, 500);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await inviteReadOnly(BASE, "q", HEADERS);

    expect(result).toEqual({
      ok: true,
      invited: true,
      permission: "pull",
      invitationId: 77,
      warning: null,
    });

    const puts = calls.filter((c) => c.init?.method === "PUT");
    expect(puts).toHaveLength(2);
    expect(JSON.parse(String(puts[0].init?.body))).toEqual({ permission: "pull" });
    expect(puts[1].init?.body).toBeUndefined();

    const patch = calls.find((c) => c.init?.method === "PATCH");
    expect(patch).toBeTruthy();
    expect(JSON.parse(String(patch?.init?.body))).toEqual({ permissions: "read" });
  });

  it("uses the explicit Read path for org-owned repos", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (init?.method === "PUT") return json({ id: 11 }, 201);
      return json({ message: "unexpected" }, 500);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await inviteReadOnly(BASE, "q", HEADERS);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.invited).toBe(true);
      expect(result.permission).toBe("pull");
      expect(result.warning).toBeNull();
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry unrelated 422 errors", async () => {
    const fetchMock = vi.fn(async () =>
      json(
        {
          message: "Validation Failed",
          errors: [{ message: "Repository owner cannot be a collaborator" }],
        },
        422
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await inviteReadOnly(BASE, "q", HEADERS);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.message).toContain("Repository owner cannot be a collaborator");
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a warning when the invitation cannot be lowered to Read", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url);
      if (init?.method === "PUT" && init.body) {
        return json(
          { message: "Validation Failed", errors: "Cannot assign q permission of read" },
          422
        );
      }
      if (init?.method === "PUT") return json({ id: 5 }, 201);
      if (href.endsWith("/invitations?per_page=100")) {
        return json([{ id: 5, invitee: { login: "q" }, permissions: "write" }]);
      }
      if (href.endsWith("/invitations/5")) return json({ message: "nope" }, 500);
      return json({ message: "unexpected" }, 500);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await inviteReadOnly(BASE, "q", HEADERS);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.invited).toBe(true);
      expect(result.permission).toBeNull();
      expect(result.warning).toMatch(/could not lower/i);
    }
  });
});
