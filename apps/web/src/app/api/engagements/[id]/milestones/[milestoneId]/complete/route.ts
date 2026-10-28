import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Engagement } from "@innoverse/database";
import { canManageEngagement, type Actor } from "@/lib/policy";
import { audit } from "@/lib/audit";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * Startup marks a single engagement milestone complete without the
 * deliver/pay dance (e.g. paid offline). Completing all milestones closes
 * the engagement.
 */
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
      return NextResponse.json({ message: "Only an active engagement can be completed" }, { status: 409 });
    }

    const milestone = engagement.milestones.id(milestoneId);
    if (!milestone) return NextResponse.json({ message: "Milestone not found" }, { status: 404 });
    if (milestone.status === "Confirmed") {
      return NextResponse.json({ message: "Milestone is already complete" }, { status: 409 });
    }

    milestone.status = "Confirmed";
    milestone.confirmedAt = new Date();
    if (!milestone.deliveredAt) milestone.deliveredAt = new Date();

    const allConfirmed = engagement.milestones.every(
      (m: any) => m.status === "Confirmed"
    );
    if (allConfirmed) engagement.status = "Completed";
    await engagement.save();

    await audit({
      actorId: actor.id,
      actorName: session.user.name ?? null,
      action: "engagement.milestone_completed_manually",
      resourceType: "Engagement",
      resourceId: id,
      metadata: { milestoneId, completed: allConfirmed },
      request: req,
    });

    return NextResponse.json({
      message: allConfirmed ? "Milestone complete; engagement closed" : "Milestone marked complete",
      completed: allConfirmed,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
