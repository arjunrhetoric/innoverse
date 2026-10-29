import { NextResponse } from "next/server";
import {
  AuditEvent,
  Certificate,
  Cohort,
  CohortMember,
  connectDB,
  Engagement,
  InlineComment,
  KnowledgeEntry,
  Milestone,
  Notification,
  Problem,
  Proposal,
  Shortlist,
  User,
} from "@innoverse/database";
import crypto from "crypto";
import QRCode from "qrcode";
import { renderCertificatePdf, getBaseUrl } from "@/lib/certificate-pdf";
import { renderContractPdf } from "@/lib/engagement-pdf";
import { generateCollaborationAgreement } from "@/lib/collaboration-agreement";
import { uploadFile } from "@/lib/storage";
import { computeConfidence, computeRubricScore } from "@/lib/evidence";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

/**
 * Development-only demo dataset. Pass ?reset=1 to wipe demo collections first.
 * Hard-disabled in production and behind the local bypass flag.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "Not available" }, { status: 404 });
  }
  if (process.env.ALLOW_TEST_STARTUP_BYPASS !== "true") {
    return NextResponse.json(
      { message: "Set ALLOW_TEST_STARTUP_BYPASS=true to seed demo data" },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const reset = new URL(req.url).searchParams.get("reset") === "1";
    if (reset) {
      await Promise.all([
        AuditEvent.deleteMany({}),
        Certificate.deleteMany({}),
        Cohort.deleteMany({}),
        CohortMember.deleteMany({}),
        Engagement.deleteMany({}),
        InlineComment.deleteMany({}),
        KnowledgeEntry.deleteMany({}),
        Milestone.deleteMany({}),
        Notification.deleteMany({}),
        Problem.deleteMany({}),
        Proposal.deleteMany({}),
        Shortlist.deleteMany({}),
        User.deleteMany({}),
      ]);
    }

    const now = Date.now();
    const inDays = (days: number) => new Date(now + days * 86400000);
    const demoPassword = await hashPassword("Innoverse2026");

    // ── Branding placeholders (real files, so the PDFs render) ──
    const [logoBytes, signatureBytes, studentSignatureBytes] = await Promise.all([
      QRCode.toBuffer("ACME LABS", { width: 360, margin: 1 }),
      QRCode.toBuffer("ACME SIGNATURE", { width: 360, margin: 1 }),
      QRCode.toBuffer("ARJUN", { width: 360, margin: 1 }),
    ]);
    const startupLogo = await uploadFile(logoBytes, "uploads/branding", "acme-logo.png", "image/png");
    const startupSignature = await uploadFile(
      signatureBytes,
      "uploads/branding",
      "acme-signature.png",
      "image/png"
    );

    // ── Users ──
    const startup = await User.create({
      // Real startup account, so GitHub sign-in links to this seeded workspace
      // and its access token can manage the challenge repositories.
      githubId: "110763131",
      githubUsername: "arjundsingh",
      name: "Acme Labs",
      email: "founder@acmelabs.dev",
      role: "Startup",
      isVerified: true,
      businessEmail: "founder@acmelabs.dev",
      companyName: "Acme Labs",
      signatoryName: "Aarav Mehta",
      signatoryTitle: "Founder & CEO",
      startupLogo,
      signatureImage: startupSignature,
      passwordHash: demoPassword,
    });

    const northwind = await User.create({
      githubId: "seed-founder-northwind",
      githubUsername: "northwind-ai",
      name: "Northwind AI",
      email: "founder@northwind.ai",
      role: "Startup",
      isVerified: true,
      businessEmail: "founder@northwind.ai",
      companyName: "Northwind AI",
      signatoryName: "Sara Iyer",
      signatoryTitle: "CTO",
      passwordHash: demoPassword,
    });

    const arjun = await User.create({
      // Real student account used for the two-account read-only demo, so
      // GitHub sign-in links to this seeded student instead of creating a
      // duplicate account.
      githubId: "161180082",
      githubUsername: "arjunrhetoric",
      name: "Arjun Singh",
      email: "arjun@student.dev",
      role: "Student",
      headline: "Full-stack developer · React + Node",
      location: "Bengaluru, India",
      skills: ["React", "TypeScript", "Node.js", "MongoDB"],
      profilePublic: true,
      passwordHash: demoPassword,
    });

    const meera = await User.create({
      githubId: "seed-meera",
      githubUsername: "meera-builds",
      name: "Meera Iyer",
      email: "meera@student.dev",
      role: "Student",
      headline: "Backend engineer · Python + Postgres",
      location: "Pune, India",
      skills: ["Python", "FastAPI", "Postgres"],
      profilePublic: true,
      passwordHash: demoPassword,
    });

    const karan = await User.create({
      githubId: "seed-karan",
      githubUsername: "karanp",
      name: "Karan Patel",
      email: "karan@student.dev",
      role: "Student",
      headline: "Frontend developer · Design systems",
      location: "Ahmedabad, India",
      skills: ["React", "Tailwind", "Figma"],
      profilePublic: true,
      passwordHash: demoPassword,
    });

    const institution = await User.create({
      githubId: "seed-institution",
      name: "State Tech University",
      email: "coordinator@statetech.edu",
      role: "Institution",
      isVerified: true,
      companyName: "State Tech University",
      passwordHash: await hashPassword("Innoverse2026"),
    });

    // ── Challenges ──
    const telemetry = await Problem.create({
      title: "Realtime analytics dashboard for fleet telemetry",
      description:
        "Build a dashboard that ingests vehicle telemetry over websockets and renders live throughput, error rates and per-device drilldowns. Ship behind a feature flag with a short design note.",
      skillsRequired: ["React", "Node.js", "WebSockets", "MongoDB"],
      createdBy: startup._id,
      finalDeadline: inDays(21),
      githubOwner: "arjundsingh",
      githubRepoName: "meet-web",
      githubRepoUrl: "https://github.com/arjundsingh/meet-web",
      contributionType: "project",
      progress: 75,
    });

    const csvIssue = await Problem.create({
      title: "Add CSV export to the billing report",
      description:
        "Open-source issue: add a streaming CSV export to the billing report endpoint, with a column header row, timezone-safe dates and tests. Good first issue for a backend contributor.",
      skillsRequired: ["TypeScript", "Node.js", "Testing"],
      createdBy: startup._id,
      finalDeadline: inDays(14),
      githubOwner: "arjundsingh",
      githubRepoName: "meet-web",
      githubRepoUrl: "https://github.com/arjundsingh/meet-web",
      contributionType: "issue",
      githubIssueNumber: 1,
      githubIssueUrl: "https://github.com/arjundsingh/meet-web/issues/1",
      labels: ["good first issue", "backend"],
    });

    const ingestion = await Problem.create({
      title: "Document ingestion pipeline with LLM summaries",
      description:
        "Design a queue-based ingestion pipeline that extracts text from PDFs, chunks it, and produces cited summaries with a human review step. Deliver a working slice and a rollout plan.",
      skillsRequired: ["Python", "FastAPI", "Postgres", "LLM"],
      createdBy: northwind._id,
      finalDeadline: inDays(28),
      contributionType: "project",
    });

    const onboarding = await Problem.create({
      title: "Redesign first-run onboarding for mobile",
      description:
        "Audit the current first-run experience and ship a progressive onboarding flow with clear empty states, sample data and a measurable activation metric.",
      skillsRequired: ["React Native", "Product design", "Analytics"],
      createdBy: northwind._id,
      finalDeadline: inDays(35),
      contributionType: "project",
    });

    // ── Milestones on the main challenge ──
    const milestoneTitles = [
      { title: "Planning & schema", description: "Scope, schema and rollout plan", days: -24, done: true },
      { title: "Ingest workers", description: "Websocket ingest and buffering", days: -17, done: true },
      { title: "Dashboard views", description: "Throughput, errors and drilldowns", days: -8, done: true },
      { title: "Load test & handover", description: "Load test, runbook and demo", days: 8, done: false },
    ];
    for (const m of milestoneTitles) {
      await Milestone.create({
        problemId: telemetry._id,
        repoOwner: "arjundsingh",
        repoName: "meet-web",
        title: m.title,
        description: m.description,
        deadline: inDays(m.days),
        completed: m.done,
        completedAt: m.done ? inDays(m.days - 1) : null,
      });
    }

    // ── Proposals ──
    const arjunProposal = await Proposal.create({
      studentId: arjun._id,
      problemId: telemetry._id,
      description:
        "I would ship a thin vertical slice first: schema, one ingest path and the main dashboard view, then harden with tests and a load test.",
      pptUrl: "https://example.com/demo-proposal.pdf",
      status: "Approved",
      feedback: "Strong plan. Start with the ingest slice.",
      repoUrl: "https://github.com/arjundsingh/meet-web",
    });

    const meeraProposal = await Proposal.create({
      studentId: meera._id,
      problemId: csvIssue._id,
      description:
        "I would implement a streaming CSV writer with a proper header row and tests for date/timezone edge cases, then a small benchmark.",
      pptUrl: "https://example.com/demo-proposal.pdf",
      status: "Approved",
      feedback: "Approved — sign the agreement to get read access.",
      repoUrl: "https://github.com/arjundsingh/meet-web/issues/1",
    });

    await Proposal.create({
      studentId: karan._id,
      problemId: ingestion._id,
      description:
        "I would start with a FastAPI worker and Postgres queue, then add chunking and cited summaries with a review UI.",
      pptUrl: "https://example.com/demo-proposal.pdf",
      status: "Pending",
      feedback: "",
    });

    // Signed collaboration agreement for Arjun (no GitHub calls in seed).
    const agreement = await generateCollaborationAgreement({
      problem: telemetry,
      student: arjun,
      startup,
      signedAt: inDays(-25),
      studentSignatureBytes,
    });
    await Proposal.updateOne(
      { _id: arjunProposal._id },
      {
        $set: {
          termsAcceptedAt: inDays(-25),
          termsAcceptedName: arjun.name,
          accessGrantedAt: inDays(-25),
          agreementCode: agreement.agreementCode,
          agreementFile: agreement.agreementFile,
        },
      }
    );

    // ── Proof-of-work report for Arjun ──
    const reportEvidence = {
      mergedPRs: 4,
      prsOpened: 5,
      commits: 42,
      commitsByStudent: 38,
      commitsByOthers: 4,
      activeDays: 12,
      linesAdded: 1200,
      linesDeleted: 180,
      reviewsGiven: 4,
      milestonesCompleted: 3,
      milestonesTotal: 4,
      snapshotAt: new Date(),
    };
    const confidence = computeConfidence(reportEvidence as any);
    const rubric = computeRubricScore({
      codeQuality: 4,
      delivery: 5,
      communication: 4,
      testing: 4,
    });
    const summary =
      "Delivered the telemetry pipeline ahead of schedule, wrote the rollout plan and reviewed a teammate's PRs. Strong ownership; add more unit tests around ingest edge cases.";
    const verificationCode = crypto.randomUUID();
    const publicToken = crypto.randomBytes(9).toString("hex");

    const reportPdf = await renderCertificatePdf({
      studentName: arjun.name,
      problemTitle: telemetry.title,
      companyName: "Acme Labs",
      rating: 5,
      issuedAt: inDays(-2),
      verificationCode,
      evidence: reportEvidence as any,
      startupLogoBytes: new Uint8Array(logoBytes),
      signatureBytes: new Uint8Array(signatureBytes),
      signatoryName: "Aarav Mehta",
      signatoryTitle: "Founder & CEO",
      rubric,
      confidence,
      summary,
      reportUrl: `${getBaseUrl()}/r/${publicToken}`,
    });
    const certificateFile = await uploadFile(
      Buffer.from(reportPdf),
      "certificates",
      "acme-telemetry-report.pdf",
      "application/pdf"
    );

    await Certificate.create({
      studentId: arjun._id,
      startupId: startup._id,
      problemId: telemetry._id,
      rating: 5,
      review: "Delivered the telemetry pipeline ahead of schedule.",
      summary,
      certificateFile,
      verificationCode,
      publicToken,
      sha256: crypto.createHash("sha256").update(Buffer.from(reportPdf)).digest("hex"),
      evidence: reportEvidence,
      rubric,
      confidence,
    });

    // ── Engagements ──
    const contractCode = `INV-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const contractPdf = await renderContractPdf({
      contractCode,
      title: "Telemetry pipeline delivery",
      description:
        "Build the ingestion service and realtime dashboard for fleet telemetry, then load-test and hand over.",
      challengeTitle: telemetry.title,
      startupName: "Acme Labs",
      studentName: arjun.name,
      currency: "INR",
      totalAmount: 60000,
      milestones: [
        { title: "Ingestion service + schema", amount: 20000, dueDate: inDays(-20).toISOString() },
        { title: "Realtime dashboard", amount: 25000, dueDate: inDays(-5).toISOString() },
        { title: "Load test + handover", amount: 15000, dueDate: inDays(8).toISOString() },
      ],
      issuedAt: inDays(-24),
      startupSignatoryName: "Aarav Mehta",
      startupSignatoryTitle: "Founder & CEO",
      signatureBytes: new Uint8Array(signatureBytes),
      studentAcceptedName: arjun.name,
      studentAcceptedAt: inDays(-24),
      studentSignatureBytes,
    });
    const contractFile = await uploadFile(
      Buffer.from(contractPdf),
      "contracts",
      `engagement-${contractCode}.pdf`,
      "application/pdf"
    );

    await Engagement.create({
      problemId: telemetry._id,
      startupId: startup._id,
      studentId: arjun._id,
      title: "Telemetry pipeline delivery",
      description:
        "Build the ingestion service and realtime dashboard for fleet telemetry, then load-test and hand over.",
      currency: "INR",
      totalAmount: 60000,
      milestones: [
        {
          title: "Ingestion service + schema",
          amount: 20000,
          dueDate: inDays(-20),
          status: "Confirmed",
          deliveredAt: inDays(-22),
          paidAt: inDays(-21),
          confirmedAt: inDays(-20),
        },
        {
          title: "Realtime dashboard",
          amount: 25000,
          dueDate: inDays(-5),
          status: "Paid",
          deliveredAt: inDays(-7),
          paidAt: inDays(-5),
          paidReference: "UTR-8842",
        },
        {
          title: "Load test + handover",
          amount: 15000,
          dueDate: inDays(8),
          status: "Delivered",
          deliveredAt: inDays(-1),
          evidenceUrl: "https://github.com/arjundsingh/meet-web/pull/1",
        },
      ],
      status: "Active",
      ipAssignmentAccepted: true,
      studentAcceptedAt: inDays(-24),
      studentAcceptedName: arjun.name,
      contractCode,
      contractFile,
    });

    await Engagement.create({
      problemId: csvIssue._id,
      startupId: startup._id,
      studentId: meera._id,
      title: "CSV export for billing",
      description: "Streaming CSV export for the billing report.",
      currency: "INR",
      totalAmount: 30000,
      milestones: [
        { title: "Streaming export + headers", amount: 18000, status: "Pending" },
        { title: "Tests + benchmark", amount: 12000, status: "Pending" },
      ],
      status: "Draft",
    });

    // ── Cohort ──
    const cohort = await Cohort.create({
      name: "CSE 2026 · Capstone Batch A",
      description: "Industry-sponsored capstones, autumn term.",
      institutionId: institution._id,
      joinCode: "INNOV26",
    });
    for (const student of [arjun, meera, karan]) {
      await CohortMember.create({ cohortId: cohort._id, studentId: student._id });
    }

    await Shortlist.create({
      startupId: startup._id,
      studentId: arjun._id,
      note: "Strong fit for the backend role in January.",
    });

    return NextResponse.json({
      message: reset ? "Demo data reset and seeded" : "Demo data seeded",
      reset,
      counts: {
        startups: 2,
        students: 3,
        challenges: 4,
        proposals: 3,
        reports: 1,
        engagements: 2,
        cohorts: 1,
      },
      logins: {
        institution: {
          email: "coordinator@statetech.edu",
          password: "Innoverse2026",
          joinCode: "INNOV26",
        },
        students: ["arjun@student.dev", "meera@student.dev", "karan@student.dev"],
        startups: ["founder@acmelabs.dev", "founder@northwind.ai"],
        password: "Innoverse2026",
      },
      reportToken: publicToken,
    });
  } catch (error: any) {
    console.error("Seed failed:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
