import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Problem, Proposal, User } from "@innoverse/database";
import { getGithubToken } from "@/lib/github-token";
import { audit } from "@/lib/audit";
import { generateCollaborationAgreement } from "@/lib/collaboration-agreement";
import { decodeSignatureDataUrl } from "@/lib/signature";
import { z } from "zod";
import mongoose from "mongoose";
import axios from "axios";

export const dynamic = "force-dynamic";

const AcceptSchema = z.object({
  ipAssignmentAccepted: z.literal(true),
  signatureDataUrl: z.string().optional(),
});

/** Agreement details for the student (or the challenge owner). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { proposalId } = await params;
    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      return NextResponse.json({ message: "Proposal not found" }, { status: 404 });
    }

    await connectDB();
    const proposal = (await Proposal.findById(proposalId).lean()) as any;
    if (!proposal) return NextResponse.json({ message: "Proposal not found" }, { status: 404 });
    const problem = (await Problem.findById(proposal.problemId).lean()) as any;
    if (!problem) return NextResponse.json({ message: "Challenge not found" }, { status: 404 });

    const isStudent = String(proposal.studentId) === String(session.user.id);
    const isOwner = String(problem.createdBy) === String(session.user.id);
    if (!isStudent && !isOwner) {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    const startup = (await User.findById(problem.createdBy)
      .select("name companyName githubUsername")
      .lean()) as any;
    const student = (await User.findById(proposal.studentId)
      .select("name githubUsername")
      .lean()) as any;

    return NextResponse.json({
      proposal: {
        id: String(proposal._id),
        status: proposal.status,
        repoUrl: proposal.repoUrl ?? null,
        termsAcceptedAt: proposal.termsAcceptedAt ?? null,
        accessGrantedAt: proposal.accessGrantedAt ?? null,
        accessStatus: proposal.accessStatus ?? null,
        accessError: proposal.accessError ?? null,
        accessCheckedAt: proposal.accessCheckedAt ?? null,
        agreementCode: proposal.agreementCode ?? null,
        agreementFile: proposal.agreementFile ?? null,
        description: proposal.description,
      },
      problem: {
        id: String(problem._id),
        title: problem.title,
        description: problem.description,
        repo: problem.githubOwner && problem.githubRepoName
          ? `${problem.githubOwner}/${problem.githubRepoName}`
          : null,
      },
      startup: {
        name: startup?.companyName || startup?.name || "Startup",
        githubUsername: startup?.githubUsername ?? null,
      },
      student: {
        name: student?.name || "Student",
        githubUsername: student?.githubUsername ?? null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/** Student signs the collaboration + IP assignment agreement. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "Student") {
      return NextResponse.json({ message: "Only the student can sign this agreement" }, { status: 403 });
    }

    const { proposalId } = await params;
    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      return NextResponse.json({ message: "Proposal not found" }, { status: 404 });
    }

    const parsed = AcceptSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "You must accept the IP assignment and confidentiality terms" },
        { status: 400 }
      );
    }

    await connectDB();
    const proposal = (await Proposal.findById(proposalId)) as any;
    if (!proposal) return NextResponse.json({ message: "Proposal not found" }, { status: 404 });
    if (String(proposal.studentId) !== String(session.user.id)) {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }
    if (proposal.status !== "Approved") {
      return NextResponse.json({ message: "This proposal is not approved" }, { status: 409 });
    }
    // Signing is idempotent: if the agreement is already signed we still
    // re-check access and re-invite if needed, instead of returning early.
    const alreadySigned = Boolean(proposal.termsAcceptedAt);

    const problem = (await Problem.findById(proposal.problemId).lean()) as any;
    if (!problem) return NextResponse.json({ message: "Challenge not found" }, { status: 404 });
    if (!problem.githubOwner || !problem.githubRepoName) {
      return NextResponse.json(
        { message: "This challenge has no linked repository yet. Ask the startup to link one." },
        { status: 400 }
      );
    }

    const student = (await User.findById(session.user.id)
      .select("name githubUsername")
      .lean()) as any;
    const startup = (await User.findById(problem.createdBy)
      .select("name companyName signatoryName signatoryTitle signatureImage")
      .lean()) as any;

    // Repository operations must run as the startup (repo admin), not the
    // student: a private repo returns 404 to a non-collaborator, and only
    // admins can invite collaborators or assign issues.
    const startupToken = await getGithubToken(String(problem.createdBy));
    if (!startupToken) {
      return NextResponse.json(
        {
          message:
            "The startup's GitHub authorization has expired. Ask the startup to sign in again, then retry.",
        },
        { status: 401 }
      );
    }
    if (!student?.githubUsername) {
      return NextResponse.json({ message: "Your GitHub username is missing" }, { status: 400 });
    }

    const isIssue = problem.contributionType === "issue";
    const headers = {
      Authorization: `Bearer ${startupToken}`,
      Accept: "application/vnd.github+json",
    };
    let repoApi = `https://api.github.com/repos/${problem.githubOwner}/${problem.githubRepoName}`;

    // Inspect the repository first so failures are explained precisely.
    let repo: any = null;
    try {
      const repoResponse = await axios.get(repoApi, { headers });
      repo = repoResponse.data;

      // Canonicalize owner/name from GitHub (renames, stale usernames).
      if (repo.owner?.login && repo.name) {
        if (
          problem.githubOwner !== repo.owner.login ||
          problem.githubRepoName !== repo.name
        ) {
          problem.githubOwner = repo.owner.login;
          problem.githubRepoName = repo.name;
          await Problem.updateOne(
            { _id: problem._id },
            {
              $set: {
                githubOwner: repo.owner.login,
                githubRepoName: repo.name,
                githubRepoUrl: repo.html_url,
              },
            }
          );
        }
        repoApi = `https://api.github.com/repos/${repo.owner.login}/${repo.name}`;
        problem.githubRepoUrl = repo.html_url;
        proposal.repoUrl = problem.githubIssueUrl || repo.html_url;
      }
    } catch (error: any) {
      const status = error.response?.status;
      console.error("Repository lookup failed:", error.response?.data || error.message);
      return NextResponse.json(
        {
          message:
            status === 404
              ? "The linked repository was not found, or your GitHub account no longer has access to it."
              : `Could not read the repository from GitHub (${status ?? "no response"}). Reconnect GitHub and try again.`,
        },
        { status: 502 }
      );
    }

    const studentLogin = String(student.githubUsername).toLowerCase();
    const repoOwner = String(repo.owner?.login ?? "").toLowerCase();
    const isRepoOwner = studentLogin === repoOwner;
    const isPublicRepo = repo.private === false;

    // GitHub also rejects inviting the token owner to their own repo (422).
    // This matters when testing with a single account.
    let tokenLogin: string | null = null;
    try {
      const me = await axios.get("https://api.github.com/user", { headers });
      tokenLogin = String(me.data?.login ?? "").toLowerCase() || null;
    } catch {
      // Non-fatal; fall back to the repo-owner comparison.
    }
    const studentIsTokenOwner = Boolean(tokenLogin) && tokenLogin === studentLogin;

    type AccessState = "owner" | "collaborator" | "invited" | "public" | "granted" | "failed";
    let accessState: AccessState = "granted";
    let accessFailure: string | null = null;

    const existingAccess = async (): Promise<"collaborator" | "invited" | "none"> => {
      try {
        const perm = await axios.get(
          `${repoApi}/collaborators/${encodeURIComponent(student.githubUsername)}/permission`,
          { headers }
        );
        const permission = String(perm.data?.permission ?? "").toLowerCase();
        // GitHub reports "none" for a pending invitation or a non-collaborator.
        if (permission && permission !== "none") return "collaborator";
      } catch {
        // Fall through to the invitation check.
      }
      try {
        const invitations = await axios.get(`${repoApi}/invitations?per_page=100`, { headers });
        const pending = (invitations.data ?? []).some(
          (inv: any) => inv.invitee?.login?.toLowerCase() === studentLogin
        );
        if (pending) return "invited";
      } catch {
        // Invitations list may be unavailable.
      }
      return "none";
    };

    let accessNote: string | null = null;

    if (isRepoOwner || studentIsTokenOwner) {
      // Owners (including the token owner) already have access; GitHub
      // rejects inviting them.
      accessState = "owner";
    } else {
      // If the student is already a collaborator, enforce read-only.
      // Manual GitHub invites default to Write, which this corrects.
      let rawPermission: string | null = null;
      try {
        const perm = await axios.get(
          `${repoApi}/collaborators/${encodeURIComponent(student.githubUsername)}/permission`,
          { headers }
        );
        rawPermission = String(perm.data?.permission ?? "").toLowerCase() || null;
      } catch {
        // Not a collaborator, or this token cannot read permissions.
      }

      // GitHub reports "none" for a non-collaborator; "read" and "pull" both
      // mean read-only.
      const permission = rawPermission === "read" ? "pull" : rawPermission;
      const isCollaborator = Boolean(permission) && permission !== "none";

      if (isCollaborator) {
        if (permission !== "pull") {
          try {
            await axios.put(
              `${repoApi}/collaborators/${encodeURIComponent(student.githubUsername)}`,
              { permission: "pull" },
              { headers }
            );
            accessState = "collaborator";
            accessNote = `GitHub access was "${rawPermission}" and has been downgraded to read-only.`;
          } catch (downgradeError: any) {
            console.error(
              "Could not downgrade collaborator:",
              downgradeError.response?.data || downgradeError.message
            );
            accessState = "collaborator";
            accessNote = `GitHub kept "${rawPermission}" access. Retry the downgrade from Innoverse → Repo access; the account still has repository access in the meantime.`;
          }
        } else {
          accessState = "collaborator";
        }
      } else if (isPublicRepo) {
        // Public repositories allow forks without an invitation; skip the
        // invite entirely and avoid unnecessary emails/API failures.
        accessState = "public";
      } else {
        try {
          const invite = await axios.put(
            `${repoApi}/collaborators/${encodeURIComponent(student.githubUsername)}`,
            { permission: "pull" },
            { headers }
          );
          // 204 usually means the account already has a pending invitation or
          // collaborator row; verify the real state instead of assuming access.
          if (invite.status === 204) {
            const state = await existingAccess();
            if (state === "collaborator") {
              accessState = "collaborator";
            } else if (state === "invited") {
              accessState = "invited";
            } else {
              accessState = "failed";
              accessFailure = `GitHub accepted the request but did not report access for @${student.githubUsername}. Retry from Innoverse or check the repository's collaborator settings.`;
            }
          } else {
            accessState = "invited";
          }
        } catch (error: any) {
          const status = error.response?.status;
          const githubMessage = error.response?.data?.message;
          const errorDetails = Array.isArray(error.response?.data?.errors)
            ? error.response.data.errors
                .map((e: any) => e?.message)
                .filter(Boolean)
                .join("; ")
            : "";
          const reason =
            [githubMessage, errorDetails].filter(Boolean).join(" — ") || "no reason provided";
          console.error("Read access grant failed:", error.response?.data || error.message);

          if (status === 422) {
            // Verify the real state instead of guessing from the status code.
            const state = await existingAccess();
            if (state === "collaborator") accessState = "collaborator";
            else if (state === "invited") accessState = "invited";
            else {
              // Signing must not be blocked by GitHub. The agreement is valid;
              // access can be granted manually by the startup.
              accessState = "failed";
              accessFailure = `GitHub did not add @${student.githubUsername} automatically (422: ${reason}). Retry from this page, or use Repo access in Innoverse settings.`;
            }
          } else {
            accessState = "failed";
            accessFailure = `GitHub refused access (${status ?? "no response"}: ${reason}). The startup can retry from Repo access in Innoverse settings.`;
          }
        }
      }
    }

    // A private-repo invitation must be accepted before the repo link works.
    let accessMessage =
      accessState === "owner"
        ? "You own this repository, so no invitation was needed."
        : accessState === "collaborator"
          ? "You already have access to this repository."
          : accessState === "public"
            ? "This is a public repository — fork it and open a pull request without an invitation."
            : accessState === "invited"
              ? "Invitation sent. Accept it on GitHub (email or notifications); the repository link returns 404 until you do."
              : accessState === "failed"
                ? accessFailure ?? "Agreement signed, but repository access could not be granted automatically."
                : "Read access granted.";

    if (accessNote) accessMessage += ` ${accessNote}`;

    const accessRecord = {
      accessStatus: accessState,
      accessError: accessState === "failed" ? accessFailure : null,
      accessCheckedAt: new Date(),
    };

    if (isIssue) {
      try {
        await axios.post(
          `${repoApi}/issues/${problem.githubIssueNumber}/assignees`,
          { assignees: [student.githubUsername] },
          { headers }
        );
      } catch (error: any) {
        const status = error.response?.status;
        const githubMessage = error.response?.data?.message;
        console.error("Issue assignment failed:", error.response?.data || error.message);
        accessMessage +=
          ` The issue could not be assigned automatically (${status ?? "no response"}${
            githubMessage ? `: ${githubMessage}` : ""
          }).`;
      }
    }

    if (alreadySigned) {
      const updates: Record<string, unknown> = {
        repoUrl: proposal.repoUrl,
        ...accessRecord,
      };
      if (accessState === "invited" || accessState === "failed") {
        // A pending or failed invitation is not active access.
        updates.accessGrantedAt = null;
      } else if (!proposal.accessGrantedAt) {
        updates.accessGrantedAt = new Date();
      }
      await Proposal.updateOne({ _id: proposal._id }, { $set: updates });
      return NextResponse.json({
        message: accessMessage,
        agreementCode: proposal.agreementCode,
        access: accessState,
        repoUrl: proposal.repoUrl,
      });
    }

    const acceptedAt = new Date();
    const studentSignatureBytes = decodeSignatureDataUrl(parsed.data.signatureDataUrl);
    if (parsed.data.signatureDataUrl && !studentSignatureBytes) {
      return NextResponse.json(
        { message: "Signature must be a PNG or JPEG image under 2MB" },
        { status: 400 }
      );
    }

    const generated = await generateCollaborationAgreement({
      problem,
      student,
      startup,
      code: proposal.agreementCode,
      studentSignatureBytes,
      signedAt: acceptedAt,
    });

    proposal.termsAcceptedAt = acceptedAt;
    proposal.termsAcceptedName = student.name;
    // For private repos, access is not active until the invitation is accepted.
    proposal.accessGrantedAt =
      accessState === "invited" || accessState === "failed" ? null : acceptedAt;
    proposal.accessStatus = accessState;
    proposal.accessError = accessState === "failed" ? accessFailure : null;
    proposal.accessCheckedAt = new Date();
    proposal.agreementCode = generated.agreementCode;
    proposal.agreementFile = generated.agreementFile;
    await proposal.save();

    await audit({
      actorId: session.user.id,
      actorName: student.name,
      action: "proposal.terms_accepted",
      resourceType: "Proposal",
      resourceId: proposalId,
      metadata: {
        agreementCode: generated.agreementCode,
        problemId: String(problem._id),
        access: "pull",
        studentSignature: Boolean(studentSignatureBytes),
      },
      request: req,
    });

    return NextResponse.json({
      message: accessMessage,
      agreementCode: generated.agreementCode,
      access: accessState,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
