import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Certificate, Proposal, Problem } from "@innoverse/database";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * For the challenge owner: approved contributors (who can be certified)
 * plus already-issued certificates for this challenge.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ problemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "Startup") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { problemId } = await params;
    if (!mongoose.Types.ObjectId.isValid(problemId)) {
      return NextResponse.json({ message: "Challenge not found" }, { status: 404 });
    }

    await connectDB();

    const problem = (await Problem.findById(problemId).lean()) as any;
    if (!problem) {
      return NextResponse.json({ message: "Challenge not found" }, { status: 404 });
    }
    if (String(problem.createdBy) !== String(session.user.id)) {
      return NextResponse.json({ message: "Only the challenge owner can view this" }, { status: 403 });
    }

    const approvedProposals = await Proposal.find({ problemId, status: "Approved" })
      .populate("studentId", "name email githubUsername")
      .lean();

    const certificates = await Certificate.find({ problemId })
      .populate("studentId", "name email githubUsername")
      .lean();

    return NextResponse.json({ problem, approvedProposals, certificates });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
