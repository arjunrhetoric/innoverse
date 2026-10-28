import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Milestone, Problem, Proposal } from "@innoverse/database";
import { emitMilestone } from "@/lib/realtime";
import { audit } from "@/lib/audit";
import { z } from "zod";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const SubmitSchema = z.object({
  evidenceUrl: z.string().trim().url().max(500),
});

/** Student submits a milestone for review with evidence (PR, commit, issue). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "Student") {
      return NextResponse.json({ message: "Only students can submit milestones" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Milestone not found" }, { status: 404 });
    }

    const parsed = SubmitSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Provide a valid evidence URL (GitHub pull request, commit, or issue)" },
        { status: 400 }
      );
    }

    await connectDB();
    const milestone = (await Milestone.findById(id)) as any;
    if (!milestone) return NextResponse.json({ message: "Milestone not found" }, { status: 404 });
    if (milestone.completed) {
      return NextResponse.json({ message: "This milestone is already completed" }, { status: 409 });
    }
    if (!milestone.problemId) {
      return NextResponse.json(
        { message: "This milestone is not linked to a challenge" },
        { status: 400 }
      );
    }

    const problem = (await Problem.findById(milestone.problemId)
      .select("createdBy title")
      .lean()) as any;
    if (!problem) return NextResponse.json({ message: "Challenge not found" }, { status: 404 });

    const approved = await Proposal.exists({
      problemId: milestone.problemId,
      studentId: session.user.id,
      status: "Approved",
    });
    if (!approved) {
      return NextResponse.json(
        { message: "Only an approved contributor can submit milestones for this challenge" },
        { status: 403 }
      );
    }

    milestone.submittedAt = new Date();
    milestone.submittedBy = session.user.id;
    milestone.evidenceUrl = parsed.data.evidenceUrl;
    milestone.reviewNote = null;
    await milestone.save();

    void emitMilestone(milestone.toObject?.() ?? milestone, "submitted", {
      id: session.user.id,
      name: session.user.name,
    });

    await audit({
      actorId: session.user.id,
      actorName: session.user.name ?? null,
      action: "milestone.submitted",
      resourceType: "Milestone",
      resourceId: id,
      metadata: {
        problemId: String(milestone.problemId),
        evidenceUrl: parsed.data.evidenceUrl,
      },
      request: req,
    });

    return NextResponse.json({
      message: "Submitted for review. The startup will approve it or request changes.",
      milestone,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
