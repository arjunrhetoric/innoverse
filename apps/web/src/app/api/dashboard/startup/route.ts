import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Problem, Proposal } from "@innoverse/database";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "Startup") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const startupId = session.user.id;
    const challenges = await Problem.find({ createdBy: startupId });
    const proposals = await Proposal.find({ problemId: { $in: challenges.map(c => c._id) } })
      .populate("studentId", "name email githubUsername")
      .populate({
        path: "problemId",
        select: "title createdBy",
        populate: { path: "createdBy", select: "name _id" },
      });
      
    return NextResponse.json({
      user: session.user,
      challenges,
      proposals,
      totalProposals: proposals.length,
      pendingReviews: proposals.filter(p => p.status === "Pending").length,
    });
  } catch (error: any) {
    return NextResponse.json({ message: "Error loading startup dashboard", error: error.message }, { status: 500 });
  }
}
