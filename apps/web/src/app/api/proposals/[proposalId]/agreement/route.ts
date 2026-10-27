import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Problem, Proposal, User } from "@innoverse/database";
import { getGithubToken } from "@/lib/github-token";
import { readStoredBytes, uploadFile } from "@/lib/storage";
import { renderCollaborationPdf } from "@/lib/collaboration-pdf";
import { audit } from "@/lib/audit";
import { z } from "zod";
import crypto from "crypto";
import mongoose from "mongoose";
import axios from "axios";

export const dynamic = "force-dynamic";

const AcceptSchema = z.object({ ipAssignmentAccepted: z.literal(true) });

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
      .select("name companyName")
      .lean()) as any;
    const student = (await User.findById(proposal.studentId).select("name").lean()) as any;

    return NextResponse.json({
      proposal: {
        id: String(proposal._id),
        status: proposal.status,
        repoUrl: proposal.repoUrl ?? null,
        termsAcceptedAt: proposal.termsAcceptedAt ?? null,
        accessGrantedAt: proposal.accessGrantedAt ?? null,
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
      startup: { name: startup?.companyName || startup?.name || "Startup" },
      student: { name: student?.name || "Student" },
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
    const repoApi = `https://api.github.com/repos/${problem.githubOwner}/${problem.githubRepoName}`;

    // Inspect the repository first so failures are explained precisely.
    let repo: any = null;
    try {
      const repoResponse = await axios.get(repoApi, { headers });
      repo = repoResponse.data;
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

    type AccessState = "owner" | "collaborator" | "invited" | "public" | "granted";
    let accessState: AccessState = "granted";

    const existingAccess = async (): Promise<"collaborator" | "invited" | "none"> => {
      try {
        await axios.get(
          `${repoApi}/collaborators/${encodeURIComponent(student.githubUsername)}`,
          { headers }
        );
        return "collaborator";
      } catch {
        // Not a collaborator (yet).
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

    if (isRepoOwner) {
      // Owners already have access; GitHub rejects inviting them.
      accessState = "owner";
    } else {
      try {
        const invite = await axios.put(
          `${repoApi}/collaborators/${encodeURIComponent(student.githubUsername)}`,
          { permission: "pull" },
          { headers }
        );
        // 204 = already a collaborator; 201 = invitation created.
        accessState = invite.status === 204 ? "collaborator" : isPublicRepo ? "public" : "invited";
      } catch (error: any) {
        const status = error.response?.status;
        const githubMessage = error.response?.data?.message;
        console.error("Read access grant failed:", error.response?.data || error.message);

        if (status === 422) {
          // Verify the real state instead of guessing from the status code.
          const state = await existingAccess();
          if (state === "collaborator") accessState = "collaborator";
          else if (state === "invited") accessState = "invited";
          else {
            return NextResponse.json(
              {
                message: `GitHub rejected the invitation (422)${
                  githubMessage ? `: ${githubMessage}` : ""
                }. Check that the student's GitHub username is correct.`,
              },
              { status: 502 }
            );
          }
        } else if (isPublicRepo) {
          // Forking a public repository does not require an invitation.
          accessState = "public";
        } else {
          return NextResponse.json(
            {
              message: `GitHub refused read access (${status ?? "no response"})${
                githubMessage ? `: ${githubMessage}` : ""
              }. The startup account must be an admin of the repository to add collaborators.`,
            },
            { status: 502 }
          );
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
              : "Read access granted.";

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
      if (accessState !== "invited" && !proposal.accessGrantedAt) {
        await Proposal.updateOne(
          { _id: proposal._id },
          { $set: { accessGrantedAt: new Date() } }
        );
      }
      return NextResponse.json({
        message: accessMessage,
        agreementCode: proposal.agreementCode,
        access: accessState,
      });
    }

    let signatureBytes: Uint8Array | null = null;
    if (startup?.signatureImage) {
      try {
        signatureBytes = await readStoredBytes(startup.signatureImage);
      } catch (error) {
        console.error("Agreement signature unavailable:", error);
      }
    }

    const agreementCode = `COL-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const acceptedAt = new Date();
    const pdf = await renderCollaborationPdf({
      agreementCode,
      projectTitle: problem.title,
      projectDescription: problem.description,
      startupName: startup?.companyName || startup?.name || "Startup",
      studentName: student.name,
      repoUrl:
        problem.githubIssueUrl ||
        `https://github.com/${problem.githubOwner}/${problem.githubRepoName}`,
      issuedAt: acceptedAt,
      startupSignatoryName: startup?.signatoryName ?? null,
      startupSignatoryTitle: startup?.signatoryTitle ?? null,
      signatureBytes,
      studentAcceptedName: student.name,
      studentAcceptedAt: acceptedAt,
    });

    const agreementFile = await uploadFile(
      Buffer.from(pdf),
      "agreements",
      `collaboration-${agreementCode}.pdf`,
      "application/pdf"
    );

    proposal.termsAcceptedAt = acceptedAt;
    proposal.termsAcceptedName = student.name;
    // For private repos, access is not active until the invitation is accepted.
    proposal.accessGrantedAt = accessState === "invited" ? null : acceptedAt;
    proposal.agreementCode = agreementCode;
    proposal.agreementFile = agreementFile;
    await proposal.save();

    await audit({
      actorId: session.user.id,
      actorName: student.name,
      action: "proposal.terms_accepted",
      resourceType: "Proposal",
      resourceId: proposalId,
      metadata: { agreementCode, problemId: String(problem._id), access: "pull" },
      request: req,
    });

    return NextResponse.json({
      message: accessMessage,
      agreementCode,
      access: accessState,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
