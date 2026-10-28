import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Engagement } from "@innoverse/database";
import { canManageEngagement, type Actor } from "@/lib/policy";
import { audit } from "@/lib/audit";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/** Close an engagement, confirming every remaining milestone. */
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
    if (engagement.status === "Completed") {
      return NextResponse.json({ message: "Engagement is already complete" }, { status: 409 });
    }
    if (engagement.status !== "Active") {
      return NextResponse.json(
        { message: "The student must accept the engagement before it can be completed" },
        { status: 409 }
      );
    }

    const now = new Date();
    for (const milestone of engagement.milestones) {
      if (milestone.status !== "Confirmed") {
        milestone.status = "Confirmed";
        milestone.confirmedAt = now;
        if (!milestone.deliveredAt) milestone.deliveredAt = now;
      }
    }
    engagement.status = "Completed";
    await engagement.save();

    await audit({
      actorId: actor.id,
      actorName: session.user.name ?? null,
      action: "engagement.completed",
      resourceType: "Engagement",
      resourceId: id,
      metadata: { milestones: engagement.milestones.length },
      request: req,
    });

    return NextResponse.json({
      message: "Engagement marked complete",
      engagement: { id, status: "Completed" },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
