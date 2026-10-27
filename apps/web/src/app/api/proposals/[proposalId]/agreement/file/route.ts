import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Problem, Proposal } from "@innoverse/database";
import { readStoredBytes } from "@/lib/storage";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/** Download the signed collaboration agreement (student or challenge owner). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { proposalId } = await params;
    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      return NextResponse.json({ message: "Agreement not found" }, { status: 404 });
    }

    await connectDB();
    const proposal = (await Proposal.findById(proposalId)
      .select("studentId problemId agreementFile agreementCode")
      .lean()) as any;
    if (!proposal?.agreementFile) {
      return NextResponse.json({ message: "Agreement not generated yet" }, { status: 404 });
    }

    const problem = (await Problem.findById(proposal.problemId)
      .select("createdBy")
      .lean()) as any;

    const isStudent = String(proposal.studentId) === String(session.user.id);
    const isOwner = problem && String(problem.createdBy) === String(session.user.id);
    if (!isStudent && !isOwner) {
      return NextResponse.json({ message: "Not authorized" }, { status: 403 });
    }

    const bytes = await readStoredBytes(proposal.agreementFile);

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${proposal.agreementCode || "agreement"}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
