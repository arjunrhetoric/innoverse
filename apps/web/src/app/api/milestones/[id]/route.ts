
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Milestone } from "@innoverse/database";
import { requireMilestoneOwner } from "@/lib/repo-access";
import { emitMilestone } from "@/lib/realtime";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const { title, description, deadline } = await req.json();

    await connectDB();
    const existing = (await Milestone.findById(id).lean()) as any;
    if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const access = await requireMilestoneOwner(
      { problemId: existing.problemId ? String(existing.problemId) : null, repoOwner: existing.repoOwner, repoName: existing.repoName },
      session.user.id
    );
    if (access instanceof NextResponse) return access;

    const milestone = await Milestone.findByIdAndUpdate(id, { title, description, deadline }, { new: true });

    void emitMilestone(
      { problemId: existing.problemId, repoOwner: existing.repoOwner, repoName: existing.repoName, _id: id },
      "updated",
      { id: session.user.id, name: session.user.name }
    );

    return NextResponse.json({ message: "Milestone updated", milestone });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    await connectDB();
    const existing = (await Milestone.findById(id).lean()) as any;
    if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const access = await requireMilestoneOwner(
      { problemId: existing.problemId ? String(existing.problemId) : null, repoOwner: existing.repoOwner, repoName: existing.repoName },
      session.user.id
    );
    if (access instanceof NextResponse) return access;

    await Milestone.findByIdAndDelete(id);

    void emitMilestone(
      { problemId: existing.problemId, repoOwner: existing.repoOwner, repoName: existing.repoName, _id: id },
      "deleted",
      { id: session.user.id, name: session.user.name }
    );

    return NextResponse.json({ message: "Milestone deleted" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
