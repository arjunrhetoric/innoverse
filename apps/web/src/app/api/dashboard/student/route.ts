import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Problem, Proposal } from "@innoverse/database";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "Student") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const problems = await Problem.find().populate("createdBy", "name email");
    const proposals = await Proposal.find({ studentId: session.user.id }).populate({
      path: "problemId",
      select: "title createdBy",
      populate: { path: "createdBy", select: "name _id" },
    });
    
    const approvedProposals = proposals.filter(p => p.status === "Approved").length;
    
    return NextResponse.json({
      user: session.user,
      problems: problems || [],
      proposals: proposals || [],
      approvedProposals: approvedProposals || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ message: "Error loading student dashboard", error: error.message }, { status: 500 });
  }
}
