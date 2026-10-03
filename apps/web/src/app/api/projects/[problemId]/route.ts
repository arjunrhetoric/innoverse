import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Problem } from "@innoverse/database";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ problemId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "Startup") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { problemId } = await params;
    await connectDB();

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return NextResponse.json({ message: "Problem not found" }, { status: 404 });
    }

    if (problem.createdBy.toString() !== session.user.id) {
      return NextResponse.json({ message: "Not authorized to delete this problem" }, { status: 403 });
    }

    await Problem.findByIdAndDelete(problemId);
    
    return NextResponse.json({ message: "Problem deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
