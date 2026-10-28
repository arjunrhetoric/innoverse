
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Milestone } from "@innoverse/database";
import { requireMilestoneOwner } from "@/lib/repo-access";
import { emitMilestone } from "@/lib/realtime";
import { audit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    await connectDB();
    const milestone = await Milestone.findById(id);
    if (!milestone) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const access = await requireMilestoneOwner(
      {
        problemId: milestone.problemId ? String(milestone.problemId) : null,
        repoOwner: (milestone as any).repoOwner,
        repoName: (milestone as any).repoName,
      },
      session.user.id
    );
    if (access instanceof NextResponse) return access;

    milestone.completed = true;
    milestone.completedAt = new Date();
    milestone.reviewNote = null;
    await milestone.save();

    void emitMilestone(
      {
        problemId: milestone.problemId,
        repoOwner: (milestone as any).repoOwner,
        repoName: (milestone as any).repoName,
        _id: milestone._id,
      },
      "completed",
      { id: session.user.id, name: session.user.name }
    );

    await audit({
      actorId: session.user.id,
      actorName: session.user.name ?? null,
      action: "milestone.completed",
      resourceType: "Milestone",
      resourceId: String(milestone._id),
      metadata: {
        problemId: milestone.problemId ? String(milestone.problemId) : null,
      },
      request: req,
    });

    return NextResponse.json({ message: "Milestone completed", milestone });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
