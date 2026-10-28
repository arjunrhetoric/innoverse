import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Engagement, User } from "@innoverse/database";
import { canAcceptEngagement, type Actor } from "@/lib/policy";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { renderContractPdf } from "@/lib/engagement-pdf";
import { readStoredBytes, uploadFile } from "@/lib/storage";
import { z } from "zod";
import crypto from "crypto";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const AcceptSchema = z.object({
  ipAssignmentAccepted: z.literal(true),
});

/** Student accepts the engagement, which generates the signed agreement. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Engagement not found" }, { status: 404 });
    }

    const parsed = AcceptSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "You must accept the IP assignment terms to continue" },
        { status: 400 }
      );
    }

    await connectDB();
    const engagement = (await Engagement.findById(id)
      .populate("studentId", "name")
      .populate("startupId", "name companyName signatoryName signatoryTitle signatureImage")
      .populate("problemId", "title")
      .lean()) as any;

    if (!engagement) return NextResponse.json({ message: "Engagement not found" }, { status: 404 });

    const actor: Actor = {
      id: session.user.id,
      role: session.user.role as Actor["role"],
    };
    const decision = canAcceptEngagement(actor, engagement);
    if (!decision.allowed) {
      return NextResponse.json({ message: decision.reason }, { status: 403 });
    }
    if (engagement.status !== "Draft") {
      return NextResponse.json({ message: "This engagement is not awaiting acceptance" }, { status: 409 });
    }

    const contractCode = `INV-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const acceptedAt = new Date();

    let signatureBytes: Uint8Array | null = null;
    if (engagement.startupId?.signatureImage) {
      try {
        signatureBytes = await readStoredBytes(engagement.startupId.signatureImage);
      } catch (err) {
        console.error("Contract: signature unavailable", err);
      }
    }

    const pdf = await renderContractPdf({
      contractCode,
      title: engagement.title,
      description: engagement.description ?? "",
      challengeTitle: engagement.problemId?.title ?? "Challenge",
      startupName: engagement.startupId?.companyName || engagement.startupId?.name || "Startup",
      studentName: engagement.studentId?.name ?? session.user.name ?? "Student",
      currency: engagement.currency,
      totalAmount: engagement.totalAmount,
      milestones: (engagement.milestones ?? []).map((m: any) => ({
        title: m.title,
        amount: m.amount,
        dueDate: m.dueDate ? new Date(m.dueDate).toISOString() : null,
      })),
      issuedAt: acceptedAt,
      startupSignatoryName: engagement.startupId?.signatoryName ?? null,
      startupSignatoryTitle: engagement.startupId?.signatoryTitle ?? null,
      signatureBytes,
      studentAcceptedName: engagement.studentId?.name ?? session.user.name ?? "Student",
      studentAcceptedAt: acceptedAt,
    });

    const contractFile = await uploadFile(
      Buffer.from(pdf),
      "contracts",
      `engagement-${contractCode}.pdf`,
      "application/pdf"
    );

    await Engagement.updateOne(
      { _id: id },
      {
        $set: {
          status: "Active",
          ipAssignmentAccepted: true,
          studentAcceptedAt: acceptedAt,
          studentAcceptedName: engagement.studentId?.name ?? session.user.name ?? "Student",
          contractCode,
          contractFile,
        },
      }
    );

    await audit({
      actorId: actor.id,
      actorName: session.user.name ?? null,
      action: "engagement.accepted",
      resourceType: "Engagement",
      resourceId: id,
      metadata: { contractCode, totalAmount: engagement.totalAmount },
      request: req,
    });

    await notify(String(engagement.startupId?._id ?? engagement.startupId), {
      title: "Engagement accepted",
      message: `${engagement.studentId?.name ?? "The student"} accepted "${engagement.title}".`,
      link: `/engagements/${id}`,
      type: "success",
    });

    return NextResponse.json({
      message: "Engagement accepted. The agreement is ready to download.",
      contractCode,
      contractFile,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
