import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Problem } from "@innoverse/database";
import { canDeleteChallenge, type Actor } from "@/lib/policy";
import { audit } from "@/lib/audit";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ problemId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { problemId } = await params;
    await connectDB();

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return NextResponse.json({ message: "Problem not found" }, { status: 404 });
    }

    const actor: Actor = {
      id: session.user.id,
      role: session.user.role as Actor["role"],
    };
    const decision = canDeleteChallenge(actor, problem);
    if (!decision.allowed) {
      return NextResponse.json({ message: decision.reason }, { status: 403 });
    }

    await Problem.findByIdAndDelete(problemId);

    await audit({
      actorId: actor.id,
      actorName: session.user.name ?? null,
      action: "challenge.deleted",
      resourceType: "Problem",
      resourceId: problemId,
      metadata: { title: problem.title },
      request: req,
    });

    return NextResponse.json({ message: "Problem deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
