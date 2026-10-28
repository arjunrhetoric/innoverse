import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Milestone } from "@innoverse/database";
import { requireMilestoneOwner } from "@/lib/repo-access";
import { emitMilestone } from "@/lib/realtime";
import { audit } from "@/lib/audit";
import { z } from "zod";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const RejectSchema = z.object({
  note: z.string().trim().min(3).max(500),
});

/** Startup requests changes on a submitted milestone. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Milestone not found" }, { status: 404 });
    }

    const parsed = RejectSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Explain what needs to change (at least 3 characters)" },
        { status: 400 }
      );
    }

    await connectDB();
    const milestone = (await Milestone.findById(id)) as any;
    if (!milestone) return NextResponse.json({ message: "Milestone not found" }, { status: 404 });

    const access = await requireMilestoneOwner(
      {
        problemId: milestone.problemId ? String(milestone.problemId) : null,
        repoOwner: milestone.repoOwner,
        repoName: milestone.repoName,
      },
      session.user.id
    );
    if (access instanceof NextResponse) return access;

    if (!milestone.submittedAt) {
      return NextResponse.json(
        { message: "This milestone has not been submitted for review" },
        { status: 409 }
      );
    }

    milestone.submittedAt = null;
    milestone.reviewNote = parsed.data.note;
    await milestone.save();

    void emitMilestone(milestone.toObject?.() ?? milestone, "changes_requested", {
      id: session.user.id,
      name: session.user.name,
    });

    await audit({
      actorId: session.user.id,
      actorName: session.user.name ?? null,
      action: "milestone.changes_requested",
      resourceType: "Milestone",
      resourceId: id,
      metadata: { problemId: milestone.problemId ? String(milestone.problemId) : null, note: parsed.data.note },
      request: req,
    });

    return NextResponse.json({
      message: "Changes requested. The student can resubmit with new evidence.",
      milestone,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
