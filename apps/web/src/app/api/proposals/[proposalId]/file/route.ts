import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Problem, Proposal } from "@innoverse/database";
import { readStoredBytes } from "@/lib/storage";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  pdf: "application/pdf",
};

/** Authorized download of a proposal file (private storage). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { proposalId } = await params;
    await connectDB();

    const proposal = (await Proposal.findById(proposalId).lean()) as any;
    if (!proposal) {
      return NextResponse.json({ message: "Proposal not found" }, { status: 404 });
    }

    const problem = (await Problem.findById(proposal.problemId)
      .select("createdBy")
      .lean()) as any;

    const isStudent = String(proposal.studentId) === String(session.user.id);
    const isOwner = problem && String(problem.createdBy) === String(session.user.id);
    if (!isStudent && !isOwner) {
      return NextResponse.json({ message: "Not authorized to view this file" }, { status: 403 });
    }

    if (!proposal.pptUrl) {
      return NextResponse.json({ message: "No file attached" }, { status: 404 });
    }

    const bytes = await readStoredBytes(proposal.pptUrl);
    const ext = String(proposal.pptUrl).split(".").pop()?.toLowerCase() ?? "";
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="proposal-${proposalId}.${ext || "bin"}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
