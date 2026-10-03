import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Proposal, Problem, User } from "@innoverse/database";
import axios from "axios";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ proposalId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { proposalId } = await params;
    const { status, feedback } = await req.json();

    await connectDB();

    const proposal = await Proposal.findById(proposalId)
      .populate('studentId')
      .populate('problemId');

    if (!proposal) {
      return NextResponse.json({ message: "Proposal not found" }, { status: 404 });
    }

    proposal.status = status;
    proposal.feedback = feedback || "";
    await proposal.save();

    if (status === "Approved") {
      const problem = await Problem.findById(proposal.problemId);
      const student = await User.findById(proposal.studentId);

      const addCollabResponse = await axios.put(
        `https://api.github.com/repos/${problem.githubOwner}/${problem.githubRepoName}/collaborators/${student.githubUsername}`,
        { permission: "push" },
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            Accept: "application/vnd.github+json"
          }
        }
      );

      proposal.repoUrl = `https://github.com/${problem.githubOwner}/${problem.githubRepoName}`;
      await proposal.save();

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
                Authorization: `Bearer ${session.accessToken}`,
                Accept: "application/vnd.github+json"
              }
            }
          );
          sha = getResponse.data.sha;
        } catch (err) {}

        const payload: any = {
          message: "docs(innoverse): init project specification readme",
          content: readmeContent
        };
        if (sha) payload.sha = sha;

        await axios.put(
          `https://api.github.com/repos/${problem.githubOwner}/${problem.githubRepoName}/contents/README.md`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              Accept: "application/vnd.github+json"
            }
          }
        );
      } catch (readmeError: any) {
        console.error("Failed to inject project README:", readmeError.response?.data || readmeError.message);
      }

      const mailOptions = {
        from: process.env.EMAIL,
        to: student.email,
        subject: '🎉 Proposal Approved! Collaboration Started',
        html: `<h2>Congratulations ${student.name}!</h2>
              <p>Your proposal for "${problem.title}" has been approved!</p>
              <p>Repository URL: <a href="${proposal.repoUrl}">${proposal.repoUrl}</a></p>
              <p>Start collaborating now!</p>`
      };

      try {
        await transporter.sendMail(mailOptions);
      } catch (emailError: any) {
        console.error("Failed to send approval email:", emailError.message);
      }
    }

    return NextResponse.json({ message: "Proposal reviewed successfully", proposal });
  } catch (error: any) {
    console.error("Review Proposal Error:", error);
    return NextResponse.json({ message: "Error reviewing proposal", error: error.message }, { status: 500 });
  }
}
