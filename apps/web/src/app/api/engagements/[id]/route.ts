import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Engagement } from "@innoverse/database";
import { canViewEngagement, type Actor } from "@/lib/policy";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
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
    const engagement = (await Engagement.findById(id)
      .populate("studentId", "name githubUsername email")
      .populate("startupId", "name companyName")
      .populate("problemId", "title")
      .lean()) as any;

    if (!engagement) {
      return NextResponse.json({ message: "Engagement not found" }, { status: 404 });
    }

    const actor: Actor = {
      id: session.user.id,
      role: session.user.role as Actor["role"],
    };
    const decision = canViewEngagement(actor, engagement);
    if (!decision.allowed) {
      return NextResponse.json({ message: decision.reason }, { status: 403 });
    }

    return NextResponse.json({
      engagement: {
        id: String(engagement._id),
        title: engagement.title,
        description: engagement.description ?? "",
        status: engagement.status,
        currency: engagement.currency,
        totalAmount: engagement.totalAmount,
        createdAt: engagement.createdAt,
        studentAcceptedAt: engagement.studentAcceptedAt,
        studentAcceptedName: engagement.studentAcceptedName,
        ipAssignmentAccepted: engagement.ipAssignmentAccepted,
        contractFile: engagement.contractFile ?? null,
        party: actor.id === String(engagement.studentId?._id) ? "student" : "startup",
        student: {
          id: String(engagement.studentId?._id ?? engagement.studentId),
          name: engagement.studentId?.name ?? "Student",
          githubUsername: engagement.studentId?.githubUsername ?? null,
          email: engagement.studentId?.email ?? null,
        },
        startup: {
          id: String(engagement.startupId?._id ?? engagement.startupId),
          name: engagement.startupId?.companyName || engagement.startupId?.name || "Startup",
        },
        problem: {
          id: String(engagement.problemId?._id ?? engagement.problemId),
          title: engagement.problemId?.title ?? "Challenge",
        },
        milestones: (engagement.milestones ?? []).map((m: any) => ({
          id: String(m._id),
          title: m.title,
          amount: m.amount,
          dueDate: m.dueDate,
          status: m.status,
          evidenceUrl: m.evidenceUrl ?? null,
          deliveredAt: m.deliveredAt ?? null,
          paidAt: m.paidAt,
          paidReference: m.paidReference,
          confirmedAt: m.confirmedAt,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
