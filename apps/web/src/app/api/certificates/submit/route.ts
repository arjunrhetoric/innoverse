import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Certificate, Proposal, User, Problem, Milestone } from "@innoverse/database";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { publish } from "@/lib/bus";
import { projectChannel } from "@/lib/channels";
import { renderCertificatePdf, getBaseUrl } from "@/lib/certificate-pdf";
import { readStoredBytes, uploadFile } from "@/lib/storage";
import { getGithubToken } from "@/lib/github-token";
import { canIssueCertificate, type Actor } from "@/lib/policy";
import { testBypassEnabled } from "@/lib/flags";
import { audit } from "@/lib/audit";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import {
  collectEvidence,
  computeConfidence,
  computeRubricScore,
  RUBRIC_CRITERIA,
} from "@/lib/evidence";
import crypto from "crypto";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "Startup") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }
    const accessToken = await getGithubToken(session.user.id);
    if (!accessToken) {
      return NextResponse.json(
        { message: "GitHub authorization expired. Please sign in again." },
        { status: 401 }
      );
    }

    const limit = await checkRateLimit(`cert-issue:${session.user.id}`, 10, 60);
    if (!limit.ok) return rateLimitResponse(limit);

    const formData = await req.formData();
    const problemId = formData.get("problemId") as string;
    const studentId = formData.get("studentId") as string;
    const rating = Number(formData.get("rating"));
    const review = formData.get("review") as string;
    const summary = (formData.get("summary") as string | null)?.trim() || "";

    const rubricScores: Record<string, number> = {};
    for (const criterion of RUBRIC_CRITERIA) {
      const raw = formData.get(`rubric.${criterion.key}`);
      if (raw !== null) rubricScores[criterion.key] = Number(raw);
    }

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
    const startup = (await User.findById(session.user.id)) as any;
    const actor: Actor = {
      id: session.user.id,
      role: session.user.role as Actor["role"],
      isVerified: Boolean(startup?.isVerified),
    };
    const decision = canIssueCertificate(actor, problem);
    if (!decision.allowed) {
      return NextResponse.json({ message: decision.reason }, { status: 403 });
    }

    // Branding is mandatory — no placeholders.
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

    // Freeze the evidence trail into the certificate/report.
    const milestoneDocs = (await Milestone.find({ problemId }).lean()) as any[];
    const evidenceStats = await collectEvidence(
      problem.githubOwner,
      problem.githubRepoName,
      student.githubUsername,
      accessToken,
      milestoneDocs
    );
    const confidence = computeConfidence(evidenceStats);
    const rubric = computeRubricScore(rubricScores);

    // Evidence gate: a certificate must be backed by something observable.
    const hasEvidence =
      evidenceStats.mergedPRs > 0 ||
      evidenceStats.commitsByStudent > 0 ||
      evidenceStats.milestonesCompleted > 0;
    if (!hasEvidence && !testBypassEnabled()) {
      return NextResponse.json(
        {
          message:
            "No verifiable work found for this student. Link a GitHub repository with their commits/PRs, or complete at least one milestone before issuing a report.",
        },
        { status: 400 }
      );
    }
    const evidence = { ...evidenceStats, snapshotAt: new Date() };

    const verificationCode = uuidv4();
    const publicToken = crypto.randomBytes(9).toString("hex");
    const reportUrl = `${getBaseUrl()}/r/${publicToken}`;

    const [startupLogoBytes, signatureBytes] = await Promise.all([
      readStoredBytes(startup.startupLogo),
      readStoredBytes(startup.signatureImage),
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
      rubric,
      confidence,
      summary: summary || review.trim(),
      reportUrl,
    });

    const certificateFile = await uploadFile(
      Buffer.from(pdfBytes),
      "certificates",
      `innoverse-cert-${String(studentId).slice(-6)}.pdf`,
      "application/pdf"
    );

    const sha256 = crypto.createHash("sha256").update(Buffer.from(pdfBytes)).digest("hex");

    const certificate = await Certificate.create({
      studentId,
      startupId: session.user.id,
      problemId,
      rating,
      review: review.trim(),
      certificateFile,
      verificationCode,
      evidence,
      sha256,
      rubric,
      confidence,
      summary: summary || review.trim(),
      publicToken,
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

    await audit({
      actorId: actor.id,
      actorName: session.user.name ?? null,
      action: "certificate.issued",
      resourceType: "Certificate",
      resourceId: String(certificate._id),
      metadata: {
        problemId: String(problemId),
        studentId: String(studentId),
        rating,
        evidence,
        sha256,
      },
      request: req,
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
