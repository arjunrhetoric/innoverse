import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Proposal, Problem, User } from "@innoverse/database";
import axios from "axios";
import nodemailer from "nodemailer";
import { getGithubToken } from "@/lib/github-token";
import { audit } from "@/lib/audit";

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
    if (String(problem.createdBy) !== String(session.user.id)) {
      return NextResponse.json(
        { message: "Only the startup that posted this challenge can review its proposals" },
        { status: 403 }
      );
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

      const accessToken = await getGithubToken(session.user.id);
      if (!accessToken) {
        return NextResponse.json(
          { message: "GitHub authorization expired. Please sign in again." },
          { status: 401 }
        );
      }

      // Grant repo access FIRST. If it fails, do not mark the proposal approved.
      try {
        await axios.put(
          `https://api.github.com/repos/${problem.githubOwner}/${problem.githubRepoName}/collaborators/${student.githubUsername}`,
          { permission: "push" },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/vnd.github+json",
            },
          }
        );
      } catch (collabError: any) {
        console.error(
          "Add collaborator failed:",
          collabError.response?.data || collabError.message
        );
        return NextResponse.json(
          {
            message:
              "Could not add the student to the GitHub repository. Check repository permissions and try again.",
          },
          { status: 502 }
        );
      }

      proposal.repoUrl = `https://github.com/${problem.githubOwner}/${problem.githubRepoName}`;

      // Non-fatal: seed a README with the challenge brief.
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

    proposal.status = status as Status;
    proposal.feedback = feedback;
    await proposal.save();

    if (status === "Approved" && student) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL,
          to: student.email,
          subject: '🎉 Proposal Approved! Collaboration Started',
          html: `<h2>Congratulations ${student.name}!</h2>
                <p>Your proposal for "${problem.title}" has been approved!</p>
                <p>Repository URL: <a href="${proposal.repoUrl}">${proposal.repoUrl}</a></p>
                <p>Start collaborating now!</p>`,
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
