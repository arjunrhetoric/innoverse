import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Engagement } from "@innoverse/database";
import { canManageEngagement, type Actor } from "@/lib/policy";
import { applyFund, checkFund, escrowView, round2, stateOf } from "@/lib/escrow";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { z } from "zod";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const FundSchema = z.object({
  amount: z.number().positive().max(100_000_000),
  reference: z
    .string()
    .trim()
    .min(3, "Enter the bank transfer or UPI reference")
    .max(120),
});

/**
 * Startup records funding for an engagement. Money is not moved by Innoverse;
 * the reference ties the ledger entry to the transfer the startup made.
 */
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

    const parsed = FundSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? "Invalid funding details" },
        { status: 400 }
      );
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

    const amount = round2(parsed.data.amount);
    const check = checkFund({
      engagementStatus: engagement.status,
      totalAmount: engagement.totalAmount,
      state: stateOf(engagement),
      amount,
    });
    if (!check.ok) return NextResponse.json({ message: check.reason }, { status: 409 });

    engagement.escrow.fundedAmount = applyFund(stateOf(engagement), amount).fundedAmount;
    engagement.escrow.ledger.push({
      type: "fund",
      amount,
      reference: parsed.data.reference,
      milestoneId: null,
      actorId: actor.id,
      createdAt: new Date(),
    });
    await engagement.save();

    await audit({
      actorId: actor.id,
      actorName: session.user.name ?? null,
      action: "engagement.escrow_funded",
      resourceType: "Engagement",
      resourceId: id,
      metadata: { amount, reference: parsed.data.reference },
      request: req,
    });

    await notify(String(engagement.studentId), {
      title: "Escrow funded",
      message: `${session.user.name ?? "The startup"} recorded ${amount} ${engagement.currency} for "${engagement.title}". Milestone payments are released from this balance.`,
      link: `/engagements/${id}`,
      type: "success",
    });

    return NextResponse.json({
      message: "Escrow funding recorded",
      escrow: escrowView(engagement),
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
