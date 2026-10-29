import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getGithubToken } from "@/lib/github-token";
import { audit } from "@/lib/audit";
import { connectDB, Problem, Proposal } from "@innoverse/database";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Schema = z.object({
  owner: z.string().trim().min(1).max(100),
  repo: z.string().trim().min(1).max(100),
  username: z.string().trim().min(1).max(100),
  // When called from a proposal row, keep that proposal's access state in sync.
  proposalId: z.string().trim().optional(),
});

const READ_OR_BELOW = new Set(["pull"]);

type SyncedAccess = "owner" | "collaborator" | "invited" | "public" | "failed";

/** Persist the verified result so the dashboard and agreement page agree. */
async function syncProposalAccess(
  proposalId: string | undefined,
  startupId: string,
  status: SyncedAccess,
  error: string | null
) {
  if (!proposalId) return;
  try {
    await connectDB();
    const proposal = (await Proposal.findById(proposalId)) as any;
    if (!proposal) return;
    const problem = (await Problem.findById(proposal.problemId)
      .select("createdBy")
      .lean()) as any;
    if (!problem || String(problem.createdBy) !== String(startupId)) return;

    const active = status === "owner" || status === "collaborator" || status === "public";
    await Proposal.updateOne(
      { _id: proposal._id },
      {
        $set: {
          accessStatus: status,
          accessError: error,
          accessCheckedAt: new Date(),
          ...(active
            ? { accessGrantedAt: proposal.accessGrantedAt ?? new Date() }
            : { accessGrantedAt: null }),
        },
      }
    );
  } catch (syncError: any) {
    console.error("Could not sync proposal access:", syncError.message);
  }
}

/**
 * Inspect and downgrade a specific collaborator to read-only, even when the
 * repository is not linked to an Innoverse challenge. Handles pending
 * invitations as well as accepted collaborators.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "Startup") {
      return NextResponse.json({ message: "Only startups can manage repository access" }, { status: 403 });
    }

    const parsed = Schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Owner, repository and GitHub username are required" },
        { status: 400 }
      );
    }

    const token = await getGithubToken(session.user.id);
    if (!token) {
      return NextResponse.json(
        { message: "GitHub authorization expired. Please sign in again." },
        { status: 401 }
      );
    }

    const { owner, repo, username } = parsed.data;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    };
    const base = `https://api.github.com/repos/${owner}/${encodeURIComponent(repo)}`;

    // 1. Verify repository access and admin rights.
    let repository: any;
    try {
      const res = await fetch(base, { headers, cache: "no-store" });
      if (!res.ok) {
        return NextResponse.json(
          { message: `Repository not found or not accessible (HTTP ${res.status})` },
          { status: 404 }
        );
      }
      repository = await res.json();
    } catch (error: any) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    const isAdmin = Boolean(repository.permissions?.admin);
    if (!isAdmin) {
      return NextResponse.json(
        {
          message:
            "Your GitHub account is not an admin of this repository, so it cannot change collaborator permissions. Change the role in GitHub → Settings → Collaborators.",
          isAdmin: false,
        },
        { status: 403 }
      );
    }

    // GitHub cannot lower the permission of the repository owner or of the
    // account holding the token; treat that as already effectively admin.
    let tokenLogin: string | null = null;
    try {
      const me = await fetch("https://api.github.com/user", { headers, cache: "no-store" });
      if (me.ok) {
        const data: any = await me.json();
        tokenLogin = String(data?.login ?? "").toLowerCase() || null;
      }
    } catch {
      // Non-fatal.
    }
    const targetLogin = username.toLowerCase();
    const ownerLogin = String(repository.owner?.login ?? "").toLowerCase();
    if (targetLogin === ownerLogin || (tokenLogin && targetLogin === tokenLogin)) {
      const reason =
        targetLogin === ownerLogin ? "the repository owner" : "the GitHub account you are signed in as";
      await syncProposalAccess(parsed.data.proposalId, session.user.id, "owner", null);
      return NextResponse.json({
        message: `@${username} is ${reason}, so GitHub cannot reduce its permission. Use a separate student account if you want to demonstrate read-only access.`,
        isAdmin,
        before: targetLogin === ownerLogin ? "owner" : "token owner",
        after: targetLogin === ownerLogin ? "owner" : "token owner",
        changed: false,
        invitationUpdated: false,
      });
    }

    // 2. Check the current collaborator permission.
    let before: string | null = null;
    let collaboratorExists = false;
    try {
      const res = await fetch(`${base}/collaborators/${encodeURIComponent(username)}/permission`, {
        headers,
        cache: "no-store",
      });
      if (res.ok) {
        const data: any = await res.json();
        const raw = String(data?.permission ?? "").toLowerCase();
        before = raw === "read" ? "pull" : raw || null;
        // GitHub returns "none" for users who are not collaborators.
        collaboratorExists = Boolean(before) && before !== "none";
      }
    } catch {
      // Fall through to invitation handling.
    }

    // Public repositories need no collaborator invitation: the student can
    // already clone and fork. Treat that as active access instead of emailing
    // an unnecessary invite.
    if (!collaboratorExists && repository.private === false) {
      await syncProposalAccess(parsed.data.proposalId, session.user.id, "public", null);
      return NextResponse.json({
        message: `@${username} can already fork this public repository — no invitation is needed.`,
        isAdmin,
        before,
        after: "public",
        changed: false,
        invitationUpdated: false,
      });
    }

    // 3. If an invitation is still pending, downgrade the invitation itself.
    let invitationUpdated = false;
    let invited = false;
    if (!collaboratorExists) {
      try {
        const invRes = await fetch(`${base}/invitations?per_page=100`, {
          headers,
          cache: "no-store",
        });
        if (invRes.ok) {
          const invitations: any[] = await invRes.json();
          const pending = invitations.find(
            (inv) => inv.invitee?.login?.toLowerCase() === username.toLowerCase()
          );
          if (pending) {
            const patch = await fetch(`${base}/invitations/${pending.id}`, {
              method: "PATCH",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ permissions: "read" }),
            });
            if (patch.ok) {
              invitationUpdated = true;
              before = String(pending.permissions ?? "pending").toLowerCase();
            } else {
              const body = await patch.text().catch(() => "");
              return NextResponse.json(
                {
                  message: `Could not update the pending invitation (HTTP ${patch.status}). ${body.slice(0, 200)}`,
                  isAdmin,
                  before,
                },
                { status: 502 }
              );
            }
          }
        }
      } catch (error: any) {
        console.error("Invitation lookup failed:", error.message);
      }
    }

    // 4. Downgrade an accepted collaborator to pull, or invite a missing one.
    let after = invitationUpdated ? "invited" : before;
    if (!invitationUpdated) {
      if (!collaboratorExists) {
        const invite = await fetch(`${base}/collaborators/${encodeURIComponent(username)}`, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ permission: "pull" }),
        });
        if (!invite.ok) {
          const body = await invite.text().catch(() => "");
          const message = `GitHub could not invite @${username} (HTTP ${invite.status}). ${body.slice(0, 300)}`;
          await syncProposalAccess(parsed.data.proposalId, session.user.id, "failed", message);
          return NextResponse.json(
            {
              message,
              isAdmin,
              before,
              after: null,
            },
            { status: 502 }
          );
        }
        invited = true;
        before = "none";
        after = "invited";
        // Verify: a 204 can mean "already a collaborator" rather than a new
        // invitation. Never report pending access when the account can read.
        try {
          const verify = await fetch(
            `${base}/collaborators/${encodeURIComponent(username)}/permission`,
            { headers, cache: "no-store" }
          );
          if (verify.ok) {
            const data: any = await verify.json();
            const raw = String(data?.permission ?? "").toLowerCase();
            if (raw && raw !== "none") {
              invited = false;
              after = raw === "read" ? "pull" : raw;
            }
          }
        } catch {
          // Keep the invitation result.
        }
      } else if (before && READ_OR_BELOW.has(before)) {
        await syncProposalAccess(parsed.data.proposalId, session.user.id, "collaborator", null);
        return NextResponse.json({
          message: `@${username} already has read-only access.`,
          isAdmin,
          before,
          after: after,
          changed: false,
        });
      } else {
        const put = await fetch(`${base}/collaborators/${encodeURIComponent(username)}`, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ permission: "pull" }),
        });
        if (!put.ok) {
          const body = await put.text().catch(() => "");
          const hint = /Cannot assign .* permission/i.test(body)
            ? " GitHub will not lower this account's permission because it is an owner/admin or has a higher organization role."
            : "";
          const message = `GitHub refused the downgrade (HTTP ${put.status}). ${body.slice(0, 300)}${hint}`;
          // The account still has access (just more than read-only), so keep
          // the proposal marked active and surface the downgrade note.
          await syncProposalAccess(parsed.data.proposalId, session.user.id, "collaborator", message);
          return NextResponse.json(
            {
              message,
              isAdmin,
              before,
              after: null,
            },
            { status: 502 }
          );
        }

        // 5. Re-read the permission so the result is verified, not assumed.
        try {
          const res = await fetch(
            `${base}/collaborators/${encodeURIComponent(username)}/permission`,
            { headers, cache: "no-store" }
          );
          if (res.ok) {
            const data: any = await res.json();
            const raw = String(data?.permission ?? "").toLowerCase();
            after = raw === "read" ? "pull" : raw || null;
          }
        } catch {
          after = "pull";
        }
      }
    }

    await audit({
      actorId: session.user.id,
      actorName: session.user.name ?? null,
      action: "access.collaborator_downgraded",
      resourceType: "User",
      resourceId: session.user.id,
      metadata: { owner, repo, username, before, after, invitationUpdated },
      request: req,
    });

    const status: SyncedAccess =
      invited || invitationUpdated
        ? "invited"
        : after && after !== "none"
          ? "collaborator"
          : "failed";
    await syncProposalAccess(
      parsed.data.proposalId,
      session.user.id,
      status,
      status === "failed" ? "GitHub did not report an active collaborator permission." : null
    );

    const ok = invited || invitationUpdated || (after && READ_OR_BELOW.has(after));
    return NextResponse.json({
      message: invited
        ? `Invitation sent to @${username} with read-only access.`
        : invitationUpdated
          ? `Pending invitation downgraded to read-only (was ${before ?? "unknown"}).`
          : ok
            ? `@${username} is now read-only (was ${before ?? "unknown"}).`
            : `GitHub accepted the request, but the reported permission is still ${after ?? "unknown"}. If the user is an organization member with a base Write role, change the org/team permission.`,
      isAdmin,
      before,
      after,
      invitationUpdated: invitationUpdated || invited,
      changed: invited || before !== after || invitationUpdated,
      orgNote:
        "If the student is an organization member or in a team with Write access, the effective permission can exceed the collaborator role. Lower the organization base role or remove the team.",
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
