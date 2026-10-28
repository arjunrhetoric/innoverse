import { NextResponse } from "next/server";
import { connectDB, Certificate, Cohort, CohortMember, Engagement, Problem, Proposal, User } from "@innoverse/database";
import crypto from "crypto";
import QRCode from "qrcode";
import { renderCertificatePdf, getBaseUrl } from "@/lib/certificate-pdf";
import { renderContractPdf } from "@/lib/engagement-pdf";
import { hashPassword } from "@/lib/password";
import { uploadFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Seeds a realistic demo dataset. Development only — hard-disabled in
 * production builds and behind the local bypass flag.
 */
export async function POST() {
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

    const startups = [
      { name: "Acme Labs", email: "founder@acmelabs.dev", companyName: "Acme Labs" },
      { name: "Northwind AI", email: "founder@northwind.ai", companyName: "Northwind AI" },
    ];
    const students = [
      {
        name: "Arjun Singh",
        email: "arjun@student.dev",
        githubUsername: "arjun-dev",
        headline: "Full-stack developer · React + Node",
        location: "Bengaluru, India",
        skills: ["React", "TypeScript", "Node.js", "MongoDB"],
      },
      {
        name: "Meera Iyer",
        email: "meera@student.dev",
        githubUsername: "meera-builds",
        headline: "Backend engineer · Python + Postgres",
        location: "Pune, India",
        skills: ["Python", "FastAPI", "Postgres"],
      },
      {
        name: "Karan Patel",
        email: "karan@student.dev",
        githubUsername: "karanp",
        headline: "Frontend developer · Design systems",
        location: "Ahmedabad, India",
        skills: ["React", "Tailwind", "Figma"],
      },
    ];

    const startupDocs: any[] = [];
    for (const s of startups) {
      const doc = await User.findOneAndUpdate(
        { email: s.email },
        {
          $setOnInsert: {
            githubId: `seed-${s.email}`,
            name: s.name,
            role: "Startup",
            isVerified: true,
            businessEmail: s.email,
            companyName: s.companyName,
            signatoryName: "Demo Founder",
            signatoryTitle: "CEO",
          },
        },
        { upsert: true, new: true }
      );
      startupDocs.push(doc);
    }

    const studentDocs: any[] = [];
    for (const s of students) {
      const doc = await User.findOneAndUpdate(
        { email: s.email },
        {
          $setOnInsert: {
            githubId: `seed-${s.email}`,
            role: "Student",
          },
          $set: {
            name: s.name,
            githubUsername: s.githubUsername,
            headline: s.headline,
            location: s.location,
            skills: s.skills,
            profilePublic: true,
          },
        },
        { upsert: true, new: true }
      );
      studentDocs.push(doc);
    }

    const institution = await User.findOneAndUpdate(
      { email: "coordinator@statetech.edu" },
      {
        $setOnInsert: {
          githubId: "seed-coordinator@statetech.edu",
          name: "State Tech University",
          role: "Institution",
          isVerified: true,
        },
        $set: {
          companyName: "State Tech University",
          passwordHash: await hashPassword("Innoverse2026"),
        },
      },
      { upsert: true, new: true }
    );

    const cohort = await Cohort.findOneAndUpdate(
      { joinCode: "INNOV26" },
      {
        $setOnInsert: {
          name: "CSE 2026 · Capstone Batch A",
          description: "Industry-sponsored capstones, autumn term.",
          institutionId: institution._id,
          joinCode: "INNOV26",
        },
      },
      { upsert: true, new: true }
    );

    for (const student of studentDocs) {
      await CohortMember.updateOne(
        { cohortId: cohort._id, studentId: student._id },
        { $setOnInsert: { cohortId: cohort._id, studentId: student._id } },
        { upsert: true }
      );
    }

    const challenges = [
      {
        title: "Realtime analytics dashboard for fleet telemetry",
        description:
          "Build a dashboard that ingests vehicle telemetry over websockets and renders live throughput, error rates and per-device drilldowns. Ship behind a feature flag.",
        skillsRequired: ["React", "Node.js", "WebSockets", "MongoDB"],
        createdBy: startupDocs[0]._id,
      },
      {
        title: "Document ingestion pipeline with LLM summaries",
        description:
          "Design a queue-based ingestion pipeline that extracts text from PDFs, chunks it, and produces cited summaries with a review workflow.",
        skillsRequired: ["Python", "FastAPI", "Postgres", "LLM"],
        createdBy: startupDocs[1]._id,
      },
    ];

    const problemDocs: any[] = [];
    for (const c of challenges) {
      const existing = await Problem.findOne({ title: c.title });
      const doc =
        existing ??
        (await Problem.create({
          ...c,
          finalDeadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          githubOwner: null,
          githubRepoName: null,
        }));
      problemDocs.push(doc);
    }

    const proposals: any[] = [];
    for (let i = 0; i < 3; i++) {
      const problem = problemDocs[i % problemDocs.length];
      const student = studentDocs[i];
      const existing = await Proposal.findOne({ problemId: problem._id, studentId: student._id });
      const doc =
        existing ??
        (await Proposal.create({
          studentId: student._id,
          problemId: problem._id,
          description:
            "I would start by shipping a thin vertical slice: schema, one ingest path, and the main dashboard view, then harden with tests.",
          pptUrl: "https://example.com/demo-proposal.pdf",
          status: "Approved",
          feedback: "Strong plan. Start with the ingestion slice.",
        }));
      proposals.push(doc);
    }

    const existingCert = await Certificate.findOne({ problemId: problemDocs[0]._id });
    let demoToken: string | null = null;
    if (!existingCert) {
      const publicToken = crypto.randomBytes(9).toString("hex");
      demoToken = publicToken;
      const verificationCode = crypto.randomUUID();
      const summary =
        "Delivered the telemetry pipeline ahead of schedule, wrote the rollout plan and mentored a second contributor. Strong ownership; add more unit tests around the ingest edge cases.";
      const evidence = {
        mergedPRs: 12,
        prsOpened: 14,
        commits: 87,
        commitsByStudent: 79,
        commitsByOthers: 8,
        activeDays: 21,
        linesAdded: 2431,
        linesDeleted: 512,
        reviewsGiven: 9,
        milestonesCompleted: 6,
        milestonesTotal: 6,
        snapshotAt: new Date(),
      };
      const rubric = {
        rows: [
          { key: "codeQuality", label: "Code quality", score: 4.5, weight: 0.35, weighted: 1.575 },
          { key: "delivery", label: "Delivery & reliability", score: 4, weight: 0.3, weighted: 1.2 },
          { key: "communication", label: "Communication", score: 5, weight: 0.2, weighted: 1 },
          { key: "testing", label: "Testing & robustness", score: 3.5, weight: 0.15, weighted: 0.525 },
        ],
        overall: 4.3,
      };
      const confidence = {
        score: 86,
        level: "high" as const,
        reasons: [
          "79 of the last 87 commits were authored by the student (91% attribution, +23)",
          "12 merged pull requests by the student (+15)",
          "6/6 milestones completed (+10)",
          "9 review comments given (+10)",
        ],
      };

      // Render a real demo report so its download link works.
      const [logoBytes, signatureBytes] = await Promise.all([
        QRCode.toBuffer("ACME LABS", { width: 320, margin: 1 }),
        QRCode.toBuffer("SIGNATURE", { width: 320, margin: 1 }),
      ]);
      const pdfBytes = await renderCertificatePdf({
        studentName: studentDocs[0].name,
        problemTitle: problemDocs[0].title,
        companyName: "Acme Labs",
        rating: 5,
        issuedAt: new Date(),
        verificationCode,
        evidence,
        startupLogoBytes: new Uint8Array(logoBytes),
        signatureBytes: new Uint8Array(signatureBytes),
        signatoryName: "Demo Founder",
        signatoryTitle: "CEO",
        rubric,
        confidence,
        summary,
        reportUrl: `${getBaseUrl()}/r/${publicToken}`,
      });
      const certificateFile = await uploadFile(
        Buffer.from(pdfBytes),
        "certificates",
        "demo-proof-of-work-report.pdf",
        "application/pdf"
      );

      await Certificate.create({
        studentId: studentDocs[0]._id,
        startupId: startupDocs[0]._id,
        problemId: problemDocs[0]._id,
        rating: 5,
        review: "Delivered the telemetry pipeline ahead of schedule and owned the rollout.",
        summary,
        certificateFile,
        verificationCode,
        publicToken,
        sha256: crypto.createHash("sha256").update(Buffer.from(pdfBytes)).digest("hex"),
        evidence,
        rubric,
        confidence,
      });
    }

    // Paid engagement demo: active, with mixed milestone states.
    const existingEngagement = await Engagement.findOne({
      problemId: problemDocs[0]._id,
      studentId: studentDocs[0]._id,
    });
    if (!existingEngagement) {
      const contractCode = `INV-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      const acceptedAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const contractMilestones = [
        { title: "Ingestion service + schema", amount: 20000, dueDate: new Date(Date.now() - 20 * 864e5).toISOString() },
        { title: "Realtime dashboard", amount: 25000, dueDate: new Date(Date.now() - 5 * 864e5).toISOString() },
        { title: "Load test + handover", amount: 15000, dueDate: new Date(Date.now() + 10 * 864e5).toISOString() },
      ];
      const contractPdf = await renderContractPdf({
        contractCode,
        title: "Telemetry pipeline delivery",
        description:
          "Build the ingestion service and realtime dashboard for fleet telemetry, then load-test and hand over.",
        challengeTitle: problemDocs[0].title,
        startupName: "Acme Labs",
        studentName: studentDocs[0].name,
        currency: "INR",
        totalAmount: 60000,
        milestones: contractMilestones,
        issuedAt: acceptedAt,
        startupSignatoryName: "Demo Founder",
        startupSignatoryTitle: "CEO",
        signatureBytes: null,
        studentAcceptedName: studentDocs[0].name,
        studentAcceptedAt: acceptedAt,
      });
      const contractFile = await uploadFile(
        Buffer.from(contractPdf),
        "contracts",
        `engagement-${contractCode}.pdf`,
        "application/pdf"
      );

      await Engagement.create({
        problemId: problemDocs[0]._id,
        startupId: startupDocs[0]._id,
        studentId: studentDocs[0]._id,
        title: "Telemetry pipeline delivery",
        description:
          "Build the ingestion service and realtime dashboard for fleet telemetry, then load-test and hand over.",
        currency: "INR",
        totalAmount: 60000,
        milestones: [
          {
            title: "Ingestion service + schema",
            amount: 20000,
            dueDate: new Date(Date.now() - 20 * 864e5),
            status: "Confirmed",
            paidAt: new Date(Date.now() - 18 * 864e5),
            confirmedAt: new Date(Date.now() - 17 * 864e5),
          },
          {
            title: "Realtime dashboard",
            amount: 25000,
            dueDate: new Date(Date.now() - 5 * 864e5),
            status: "Paid",
            paidAt: new Date(Date.now() - 2 * 864e5),
            paidReference: "UTR-8842",
          },
          {
            title: "Load test + handover",
            amount: 15000,
            dueDate: new Date(Date.now() + 10 * 864e5),
            status: "Delivered",
            evidenceUrl: "https://github.com/acme-labs/telemetry/pull/12",
            deliveredAt: new Date(Date.now() - 1 * 864e5),
          },
        ],
        status: "Active",
        ipAssignmentAccepted: true,
        studentAcceptedAt: acceptedAt,
        studentAcceptedName: studentDocs[0].name,
        contractCode,
        contractFile,
      });
    }

    // Draft invitation, ready to accept during the demo.
    if (!(await Engagement.exists({ problemId: problemDocs[1]._id, studentId: studentDocs[1]._id }))) {
      await Engagement.create({
        problemId: problemDocs[1]._id,
        startupId: startupDocs[0]._id,
        studentId: studentDocs[1]._id,
        title: "Document ingestion pipeline",
        description: "Extract, chunk and summarise PDFs with cited summaries.",
        currency: "INR",
        totalAmount: 45000,
        milestones: [
          { title: "Ingestion + extraction", amount: 20000, status: "Pending" },
          { title: "Summaries with citations", amount: 25000, status: "Pending" },
        ],
        status: "Draft",
      });
    }

    // Backfill shareable links on older certificates so Explore can show them.
    const missing = await Certificate.find({
      $or: [{ publicToken: { $exists: false } }, { publicToken: null }],
    })
      .select("_id")
      .limit(50)
      .lean();
    for (const cert of missing) {
      await Certificate.updateOne(
        { _id: (cert as any)._id },
        { $set: { publicToken: crypto.randomBytes(9).toString("hex") } }
      );
    }

    return NextResponse.json({
      message: "Demo data seeded",
      startups: startupDocs.length,
      students: studentDocs.length,
      challenges: problemDocs.length,
      proposals: proposals.length,
      backfilledReports: missing.length,
      demoReportToken: demoToken,
      institution: { email: "coordinator@statetech.edu", password: "Innoverse2026", joinCode: cohort.joinCode },
      logins: {
        startups: startups.map((s) => s.email),
        students: students.map((s) => s.email),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
