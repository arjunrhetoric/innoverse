import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Engagement } from "@innoverse/database";
import { canManageEngagement, type Actor } from "@/lib/policy";
import { applyRefund, checkRefund, escrowView, stateOf } from "@/lib/escrow";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { z } from "zod";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const RefundSchema = z.object({
  reference: z.string().trim().max(120).optional(),
});

/** Returns whatever is still held in escrow once the engagement has ended. */
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

    const parsed = RefundSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid refund reference" }, { status: 400 });
    }

    await connectDB();
    const engagement = (await Engagement.findById(id)) as any;
    if (!engagement) return NextResponse.json({ message: "Engagement not found" }, { status: 404 });

    const actor: Actor = {
      id: session.user.id,
      role: session.user.role as Actor["role"],
    };
    const decision = canManageEngagement(actor, engagement);
    if (!decision.allowed) return NextResponse.json({ message: decision.reason }, { status: 403 });

    const state = stateOf(engagement);
    const check = checkRefund({ engagementStatus: engagement.status, state });
    if (!check.ok) return NextResponse.json({ message: check.reason }, { status: 409 });

    const { state: next, amount } = applyRefund(state);
    engagement.escrow.refundedAmount = next.refundedAmount;
    engagement.escrow.ledger.push({
      type: "refund",
      amount,
      reference: parsed.data.reference ?? null,
      milestoneId: null,
      actorId: actor.id,
      createdAt: new Date(),
    });
    await engagement.save();

    await audit({
      actorId: actor.id,
      actorName: session.user.name ?? null,
      action: "engagement.escrow_refunded",
      resourceType: "Engagement",
      resourceId: id,
      metadata: { amount, reference: parsed.data.reference ?? null },
      request: req,
    });

    await notify(String(engagement.studentId), {
      title: "Escrow balance returned",
      message: `${amount} ${engagement.currency} of unreleased escrow for "${engagement.title}" was returned to the startup.`,
      link: `/engagements/${id}`,
      type: "info",
    });

    return NextResponse.json({
      message: `Returned ${amount} ${engagement.currency} from escrow`,
      escrow: escrowView(engagement),
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
