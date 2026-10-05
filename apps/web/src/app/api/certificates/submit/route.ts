import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Certificate, Proposal, User, Problem, Milestone } from "@innoverse/database";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import axios from "axios";
import { publish } from "@/lib/bus";
import { projectChannel } from "@/lib/realtime";
import { renderCertificatePdf } from "@/lib/certificate-pdf";
import { readPublicBytes, uploadPublic } from "@/lib/storage";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function countStudentEvidence(
  owner: string | undefined,
  repo: string | undefined,
  username: string | undefined,
  token: string,
  problemId: string
) {
  const evidence = { mergedPRs: 0, commits: 0, milestonesCompleted: 0, milestonesTotal: 0 };

  const milestones = (await Milestone.find({ problemId }).lean()) as any[];
  evidence.milestonesTotal = milestones.length;
  evidence.milestonesCompleted = milestones.filter((m) => m.completed).length;

  if (!owner || !repo || !username) return evidence;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  };

  try {
    const prs = (
      await axios.get(
        `https://api.github.com/repos/${owner}/${encodeURIComponent(repo)}/pulls`,
        { headers, params: { state: "closed", per_page: 100 } }
      )
    ).data;
    evidence.mergedPRs = (Array.isArray(prs) ? prs : []).filter(
      (pr: any) => pr.merged_at && pr.user?.login?.toLowerCase() === username.toLowerCase()
    ).length;
  } catch (err) {
    console.error("Evidence PR fetch failed:", err);
  }

  try {
    const commits = (
      await axios.get(
        `https://api.github.com/repos/${owner}/${encodeURIComponent(repo)}/commits`,
        { headers, params: { author: username, per_page: 100 } }
      )
    ).data;
    evidence.commits = Array.isArray(commits) ? commits.length : 0;
  } catch (err) {
    console.error("Evidence commit fetch failed:", err);
  }

  return evidence;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken || session.user.role !== "Startup") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const problemId = formData.get("problemId") as string;
    const studentId = formData.get("studentId") as string;
    const rating = Number(formData.get("rating"));
    const review = formData.get("review") as string;

    if (!problemId || !mongoose.Types.ObjectId.isValid(problemId)) {
      return NextResponse.json({ message: "A valid problemId is required" }, { status: 400 });
    }
    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return NextResponse.json({ message: "The approved student must be selected" }, { status: 400 });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ message: "Rating must be between 1 and 5" }, { status: 400 });
    }
    if (!review || !review.trim()) {
      return NextResponse.json({ message: "A review is required" }, { status: 400 });
    }

    await connectDB();

    const problem = (await Problem.findById(problemId)) as any;
    if (!problem) {
      return NextResponse.json({ message: "Challenge not found" }, { status: 404 });
    }
    if (String(problem.createdBy) !== String(session.user.id)) {
      return NextResponse.json(
        { message: "Only the startup that posted this challenge can issue certificates" },
        { status: 403 }
      );
    }

    // Branding is mandatory — no placeholders.
    const startup = (await User.findById(session.user.id)) as any;
    if (!startup?.startupLogo || !startup?.signatureImage || !startup?.signatoryName) {
      return NextResponse.json(
        { message: "Complete your Company Branding (logo, signature, signatory) before issuing certificates" },
        { status: 400 }
      );
    }

    // Attach to the APPROVED proposal for this student — never the first proposal.
    const proposal = (await Proposal.findOne({
      problemId,
      studentId,
      status: "Approved",
    })) as any;
    if (!proposal) {
      return NextResponse.json(
        { message: "No approved proposal found for this student on this challenge" },
        { status: 404 }
      );
    }

    const duplicate = await Certificate.exists({ problemId, studentId });
    if (duplicate) {
      return NextResponse.json(
        { message: "A certificate has already been issued for this student on this challenge" },
        { status: 409 }
      );
    }

    const student = (await User.findById(studentId)) as any;
    if (!student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    // Freeze the evidence trail into the certificate.
    const evidence = await countStudentEvidence(
      problem.githubOwner,
      problem.githubRepoName,
      student.githubUsername,
      session.accessToken,
      String(problemId)
    );

    const verificationCode = uuidv4();

    const [startupLogoBytes, signatureBytes] = await Promise.all([
      readPublicBytes(startup.startupLogo),
      readPublicBytes(startup.signatureImage),
    ]);

    const pdfBytes = await renderCertificatePdf({
      studentName: student.name,
      problemTitle: problem.title,
      companyName: startup.companyName || startup.name,
      rating,
      issuedAt: new Date(),
      verificationCode,
      evidence,
      startupLogoBytes,
      signatureBytes,
      signatoryName: startup.signatoryName,
      signatoryTitle: startup.signatoryTitle || "",
    });

    const certificateFile = await uploadPublic(
      Buffer.from(pdfBytes),
      "certificates",
      `innoverse-cert-${String(studentId).slice(-6)}.pdf`,
      "application/pdf"
    );

    const certificate = await Certificate.create({
      studentId,
      startupId: session.user.id,
      problemId,
      rating,
      review: review.trim(),
      certificateFile,
      verificationCode,
      evidence,
    });

    student.projectsCompleted = (student.projectsCompleted || 0) + 1;
    student.ratings.push(rating);
    await student.save();

    try {
      await transporter.sendMail({
        from: process.env.EMAIL,
        to: student.email,
        subject: "🎉 Project Completion Certificate Issued!",
        html: `<h2>Congratulations ${student.name}!</h2>
              <p>Your Innoverse certificate for project <b>${problem.title}</b> has been issued!</p>
              <p><b>Evidence:</b> ${evidence.mergedPRs} merged pull requests, ${evidence.commits} commits, ${evidence.milestonesCompleted}/${evidence.milestonesTotal} milestones.</p>
              <p><b>Rating:</b> ${"⭐".repeat(rating)}</p>
              <p><b>Review:</b> ${review}</p>
              <p>Download your certificate from your profile page.</p>`,
      });
    } catch (e) {
      console.error("Error sending cert email:", e);
    }

    publish(projectChannel(String(problemId)), {
      type: "certificate",
      action: "issued",
      actorId: session.user.id,
      actorName: session.user.name,
      studentId: String(studentId),
    });

    return NextResponse.json(
      { message: "Certificate issued successfully", certificate },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Certificate issuance error:", error);
    return NextResponse.json({ message: error.message || "Error issuing certificate" }, { status: 500 });
  }
}
