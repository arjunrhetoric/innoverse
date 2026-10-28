import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Engagement } from "@innoverse/database";
import { canManageEngagement, type Actor } from "@/lib/policy";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { z } from "zod";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const PaySchema = z.object({
  reference: z.string().trim().max(120).optional(),
});

/** Startup records a milestone payment (manual reference; no gateway yet). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id, milestoneId } = await params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(milestoneId)) {
      return NextResponse.json({ message: "Engagement not found" }, { status: 404 });
    }

    const parsed = PaySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid payment reference" }, { status: 400 });
    }

    await connectDB();
    const engagement = (await Engagement.findById(id)) as any;
    if (!engagement) return NextResponse.json({ message: "Engagement not found" }, { status: 404 });

    const actor: Actor = {
      id: session.user.id,
      role: session.user.role as Actor["role"],
    };
    const decision = canManageEngagement(actor, engagement);
    if (!decision.allowed) {
      return NextResponse.json({ message: decision.reason }, { status: 403 });
    }
    if (engagement.status !== "Active") {
      return NextResponse.json({ message: "Only active engagements accept payments" }, { status: 409 });
    }

    const milestone = engagement.milestones.id(milestoneId);
    if (!milestone) {
      return NextResponse.json({ message: "Milestone not found" }, { status: 404 });
    }
    if (milestone.status !== "Delivered") {
      return NextResponse.json(
        { message: "The student must deliver this milestone (with evidence) before payment" },
        { status: 409 }
      );
    }

    milestone.status = "Paid";
    milestone.paidAt = new Date();
    milestone.paidReference = parsed.data.reference ?? null;
    await engagement.save();

    await audit({
      actorId: actor.id,
      actorName: session.user.name ?? null,
      action: "engagement.milestone_paid",
      resourceType: "Engagement",
      resourceId: id,
      metadata: { milestoneId, amount: milestone.amount, reference: milestone.paidReference },
      request: req,
    });

    await notify(String(engagement.studentId), {
      title: "Milestone marked paid",
      message: `${session.user.name ?? "The startup"} marked "${milestone.title}" paid. Confirm receipt in your engagement.`,
      link: `/engagements/${id}`,
      type: "success",
    });

    return NextResponse.json({ message: "Milestone marked as paid", milestone });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
