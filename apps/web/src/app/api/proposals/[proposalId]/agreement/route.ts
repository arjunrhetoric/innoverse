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
    if (proposal.termsAcceptedAt) {
      return NextResponse.json({ message: "Agreement already signed", agreementCode: proposal.agreementCode });
    }

    const problem = (await Problem.findById(proposal.problemId).lean()) as any;
    if (!problem) return NextResponse.json({ message: "Challenge not found" }, { status: 404 });
    if (!problem.githubOwner || !problem.githubRepoName) {
      return NextResponse.json(
        { message: "This challenge has no linked repository yet. Ask the startup to link one." },
        { status: 400 }
      );
    }

    const student = (await User.findById(session.user.id).select("name").lean()) as any;
    const startup = (await User.findById(problem.createdBy)
      .select("name companyName signatoryName signatoryTitle signatureImage")
      .lean()) as any;

    // Grant READ access only. Contributions go through forks and PRs.
    const token = await getGithubToken(session.user.id);
    if (!token) {
      return NextResponse.json(
        { message: "GitHub authorization expired. Please sign in again." },
        { status: 401 }
      );
    }
    if (!student?.githubUsername) {
      return NextResponse.json({ message: "Your GitHub username is missing" }, { status: 400 });
    }

    const isIssue = problem.contributionType === "issue";
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    };

    if (isIssue) {
      // Assign the issue to the student. Read access is best-effort so the
      // flow also works for public open-source repositories.
      try {
        await axios.post(
          `https://api.github.com/repos/${problem.githubOwner}/${problem.githubRepoName}/issues/${problem.githubIssueNumber}/assignees`,
          { assignees: [student.githubUsername] },
          { headers }
        );
      } catch (error: any) {
        console.error("Issue assignment failed:", error.response?.data || error.message);
        return NextResponse.json(
          {
            message:
              "Could not assign the GitHub issue to you. Ask the startup to confirm issue permissions.",
          },
          { status: 502 }
        );
      }

      try {
        await axios.put(
          `https://api.github.com/repos/${problem.githubOwner}/${problem.githubRepoName}/collaborators/${student.githubUsername}`,
          { permission: "pull" },
          { headers }
        );
      } catch (error: any) {
        // Public repositories do not need collaborator access to fork.
        console.log("Read access not granted (may be a public repo):", error.response?.status);
      }
    } else {
      try {
        await axios.put(
          `https://api.github.com/repos/${problem.githubOwner}/${problem.githubRepoName}/collaborators/${student.githubUsername}`,
          { permission: "pull" },
          { headers }
        );
      } catch (error: any) {
        console.error("Read access grant failed:", error.response?.data || error.message);
        return NextResponse.json(
          {
            message:
              "Could not grant read access to the repository. Check repository permissions and try again.",
          },
          { status: 502 }
        );
      }
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
    proposal.accessGrantedAt = acceptedAt;
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
      message: isIssue
        ? "Agreement signed. The issue is assigned to you — fork the repo, open a pull request, and reference the issue."
        : "Agreement signed. Read access granted — fork the repo and open a pull request.",
      agreementCode,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
