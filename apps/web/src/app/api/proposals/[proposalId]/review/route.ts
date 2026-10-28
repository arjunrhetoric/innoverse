import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Proposal, Problem, User } from "@innoverse/database";
import axios from "axios";
import nodemailer from "nodemailer";
import { getGithubToken } from "@/lib/github-token";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { canReviewProposal, type Actor } from "@/lib/policy";
import { generateCollaborationAgreement } from "@/lib/collaboration-agreement";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});

const ALLOWED_STATUSES = ["Pending", "Approved", "Rejected"] as const;
type Status = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ proposalId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { proposalId } = await params;
    const body = await req.json();

    const status = String(body?.status ?? "");
    if (!(ALLOWED_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json(
        { message: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }
    const feedback =
      typeof body?.feedback === "string" ? body.feedback.slice(0, 2000) : "";

    await connectDB();

    const proposal = await Proposal.findById(proposalId);
    if (!proposal) {
      return NextResponse.json({ message: "Proposal not found" }, { status: 404 });
    }

    const problem = (await Problem.findById(proposal.problemId).lean()) as any;
    if (!problem) {
      return NextResponse.json({ message: "Challenge not found" }, { status: 404 });
    }

    // ── Authorization: only the startup that owns the challenge may review. ──
    const actor: Actor = {
      id: session.user.id,
      role: session.user.role as Actor["role"],
      isVerified: true,
    };
    const decision = canReviewProposal(actor, problem);
    if (!decision.allowed) {
      return NextResponse.json({ message: decision.reason }, { status: 403 });
    }

    // ── Idempotency: repeating the same decision must not re-run side effects. ──
    if (proposal.status === status && (proposal.feedback || "") === feedback) {
      return NextResponse.json({ message: "No change", proposal });
    }

    const student = (await User.findById(proposal.studentId).lean()) as any;

    if (status === "Approved") {
      if (!student) {
        return NextResponse.json({ message: "Student not found" }, { status: 404 });
      }
      if (!problem.githubOwner || !problem.githubRepoName) {
        return NextResponse.json(
          { message: "This challenge has no linked GitHub repository to grant access to" },
          { status: 400 }
        );
      }
      if (!student.githubUsername) {
        return NextResponse.json(
          { message: "The student has no GitHub username on file" },
          { status: 400 }
        );
      }

      // Access is granted only after the student signs the collaboration
      // agreement (see /api/proposals/[id]/accept-terms). Approval alone
      // does not touch the repository.
      proposal.repoUrl =
        problem.githubIssueUrl ||
        `https://github.com/${problem.githubOwner}/${problem.githubRepoName}`;

      // Draft agreement is available immediately; it is re-generated with the
      // student's signature when they accept.
      try {
        const startup = await User.findById(problem.createdBy)
          .select("name companyName signatoryName signatoryTitle signatureImage")
          .lean();
        const agreement = await generateCollaborationAgreement({
          problem,
          student,
          startup,
          code: proposal.agreementCode,
        });
        proposal.agreementCode = agreement.agreementCode;
        proposal.agreementFile = agreement.agreementFile;
      } catch (agreementError) {
        console.error("Draft agreement generation failed:", agreementError);
      }

      // Non-fatal: seed a README with the challenge brief.
      const accessToken = await getGithubToken(session.user.id);
      if (accessToken) {
        try {
        const readmeContent = Buffer.from(
          `## ${problem.title}\n\n**Challenge Description:**\n${problem.description}\n\n---\n*Collaboration Environment initialized successfully by Innoverse.*`
        ).toString("base64");

        let sha;
        try {
          const getResponse = await axios.get(
            `https://api.github.com/repos/${problem.githubOwner}/${problem.githubRepoName}/contents/README.md`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
              },
            }
          );
          sha = getResponse.data.sha;
        } catch {
          // No README yet — expected.
        }

        const payload: any = {
          message: "docs(innoverse): init project specification readme",
          content: readmeContent,
        };
        if (sha) payload.sha = sha;

        await axios.put(
          `https://api.github.com/repos/${problem.githubOwner}/${problem.githubRepoName}/contents/README.md`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/vnd.github+json",
            },
          }
        );
      } catch (readmeError: any) {
        console.error(
          "Failed to inject project README:",
          readmeError.response?.data || readmeError.message
        );
      }
      }
    }
    proposal.status = status as Status;
    proposal.feedback = feedback;
    await proposal.save();

    await notify(String(proposal.studentId), {
      title:
        status === "Approved"
          ? "Proposal approved"
          : status === "Rejected"
            ? "Proposal rejected"
            : "Proposal updated",
      message:
        status === "Approved"
          ? `Sign the collaboration agreement to get read access to ${problem.title}.`
          : feedback
            ? `Feedback: ${feedback.slice(0, 120)}`
            : `Your proposal for ${problem.title} was updated.`,
      link:
        status === "Approved"
          ? `/proposals/${proposal._id}/agreement`
          : "/dashboard/student",
      type: status === "Rejected" ? "warning" : "success",
    });

    if (status === "Approved" && student) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL,
          to: student.email,
          subject: '🎉 Proposal Approved — sign the agreement to start',
          html: `<h2>Congratulations ${student.name}!</h2>
                <p>Your proposal for "${problem.title}" has been approved.</p>
                <p>To protect both sides, access is granted after you sign the collaboration and IP assignment agreement in your dashboard.</p>
                <p>Sign it here: <a href="${process.env.NEXTAUTH_URL || ""}/dashboard/student">your dashboard</a></p>
                <p>After signing you get read access to the repository and contribute through forks and pull requests.</p>`,
        });
      } catch (emailError: any) {
        console.error("Failed to send approval email:", emailError.message);
      }
    }

    await audit({
      actorId: session.user.id,
      actorName: session.user.name ?? null,
      action: `proposal.${status.toLowerCase()}`,
      resourceType: "Proposal",
      resourceId: String(proposal._id),
      metadata: { problemId: String(problem._id), studentId: String(proposal.studentId), feedback },
      request: req,
    });

    return NextResponse.json({ message: "Proposal reviewed successfully", proposal });
  } catch (error: any) {
    console.error("Review Proposal Error:", error);
    return NextResponse.json({ message: "Error reviewing proposal", error: error.message }, { status: 500 });
  }
}
