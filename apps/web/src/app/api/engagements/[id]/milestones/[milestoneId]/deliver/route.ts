import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Engagement } from "@innoverse/database";
import { canAcceptEngagement, type Actor } from "@/lib/policy";
import { audit } from "@/lib/audit";
import { z } from "zod";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const DeliverSchema = z.object({
  evidenceUrl: z.string().trim().url().max(500),
});

/** Student marks a milestone delivered, with evidence (PR, commit, issue). */
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

    const parsed = DeliverSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Provide a valid evidence URL (pull request, commit, or document)" },
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
    const decision = canAcceptEngagement(actor, engagement);
    if (!decision.allowed) {
      return NextResponse.json({ message: decision.reason }, { status: 403 });
    }
    if (engagement.status !== "Active") {
      return NextResponse.json({ message: "This engagement is not active" }, { status: 409 });
    }

    const milestone = engagement.milestones.id(milestoneId);
    if (!milestone) return NextResponse.json({ message: "Milestone not found" }, { status: 404 });
    if (milestone.status !== "Pending") {
      return NextResponse.json(
        { message: "This milestone has already been delivered or paid" },
        { status: 409 }
      );
    }

    milestone.status = "Delivered";
    milestone.deliveredAt = new Date();
    milestone.evidenceUrl = parsed.data.evidenceUrl;
    await engagement.save();

    await audit({
      actorId: actor.id,
      actorName: session.user.name ?? null,
      action: "engagement.milestone_delivered",
      resourceType: "Engagement",
      resourceId: id,
      metadata: { milestoneId, evidenceUrl: parsed.data.evidenceUrl },
      request: req,
    });

    return NextResponse.json({
      message: "Milestone delivered. The startup can review and mark it paid.",
      milestone,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
