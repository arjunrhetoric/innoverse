import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Engagement, Problem, Proposal, User } from "@innoverse/database";
import { canCreateEngagement, type Actor } from "@/lib/policy";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { z } from "zod";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

const MilestoneInput = z.object({
  title: z.string().trim().min(2).max(160),
  amount: z.number().positive().max(100_000_000),
  dueDate: z.string().optional(),
});

const CreateSchema = z.object({
  problemId: z.string().regex(/^[a-f0-9]{24}$/i),
  studentId: z.string().regex(/^[a-f0-9]{24}$/i),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(3000).optional(),
  currency: z.string().trim().min(1).max(8).optional(),
  milestones: z.array(MilestoneInput).min(1).max(10),
});

/** Engagements visible to the signed-in party. */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const role = session.user.role;
    const filter =
      role === "Startup"
        ? { startupId: session.user.id }
        : role === "Student"
          ? { studentId: session.user.id }
          : null;

    if (!filter) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const engagements = (await Engagement.find(filter)
      .populate("studentId", "name githubUsername")
      .populate("startupId", "name companyName")
      .populate("problemId", "title")
      .sort({ createdAt: -1 })
      .lean()) as any[];

    return NextResponse.json({
      engagements: engagements.map((e) => ({
        id: String(e._id),
        title: e.title,
        status: e.status,
        currency: e.currency,
        totalAmount: e.totalAmount,
        createdAt: e.createdAt,
        studentAcceptedAt: e.studentAcceptedAt,
        student: {
          id: String(e.studentId?._id ?? e.studentId),
          name: e.studentId?.name ?? "Student",
          githubUsername: e.studentId?.githubUsername ?? null,
        },
        startup: {
          id: String(e.startupId?._id ?? e.startupId),
          name: e.startupId?.companyName || e.startupId?.name || "Startup",
        },
        problem: { id: String(e.problemId?._id ?? e.problemId), title: e.problemId?.title ?? "Challenge" },
        milestoneCount: e.milestones?.length ?? 0,
        paidCount: (e.milestones ?? []).filter((m: any) => m.status === "Paid" || m.status === "Confirmed").length,
        confirmedCount: (e.milestones ?? []).filter((m: any) => m.status === "Confirmed").length,
        contractFile: e.contractFile ?? null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid engagement", issues: parsed.error.issues.map((i) => i.message) },
        { status: 400 }
      );
    }

    await connectDB();

    const problem = (await Problem.findById(parsed.data.problemId).lean()) as any;
    if (!problem) return NextResponse.json({ message: "Challenge not found" }, { status: 404 });

    const actor: Actor = {
      id: session.user.id,
      role: session.user.role as Actor["role"],
    };
    const decision = canCreateEngagement(actor, problem);
    if (!decision.allowed) {
      return NextResponse.json({ message: decision.reason }, { status: 403 });
    }

    const student = (await User.findById(parsed.data.studentId)
      .select("_id name role")
      .lean()) as any;
    if (!student || student.role !== "Student") {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    const approved = await Proposal.exists({
      problemId: parsed.data.problemId,
      studentId: parsed.data.studentId,
      status: "Approved",
    });
    if (!approved) {
      return NextResponse.json(
        { message: "The student must have an approved proposal on this challenge" },
        { status: 400 }
      );
    }

    const existing = await Engagement.exists({
      problemId: parsed.data.problemId,
      studentId: parsed.data.studentId,
      status: { $in: ["Draft", "Active"] },
    });
    if (existing) {
      return NextResponse.json(
        { message: "An open engagement already exists for this student on this challenge" },
        { status: 409 }
      );
    }

    const totalAmount = parsed.data.milestones.reduce((sum, m) => sum + m.amount, 0);

    const engagement = await Engagement.create({
      problemId: parsed.data.problemId,
      startupId: session.user.id,
      studentId: parsed.data.studentId,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      currency: parsed.data.currency ?? "INR",
      totalAmount,
      milestones: parsed.data.milestones.map((m) => ({
        title: m.title,
        amount: m.amount,
        dueDate: m.dueDate ? new Date(m.dueDate) : null,
        status: "Pending",
      })),
      status: "Draft",
    });

    await audit({
      actorId: actor.id,
      actorName: session.user.name ?? null,
      action: "engagement.created",
      resourceType: "Engagement",
      resourceId: String(engagement._id),
      metadata: {
        problemId: parsed.data.problemId,
        studentId: parsed.data.studentId,
        totalAmount,
        currency: engagement.currency,
      },
      request: req,
    });

    await notify(parsed.data.studentId, {
      title: "New engagement",
      message: `${session.user.name ?? "A startup"} invited you to a paid engagement: ${engagement.title}.`,
      link: `/engagements/${engagement._id}`,
      type: "info",
    });

    return NextResponse.json({ message: "Engagement created", engagement }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
