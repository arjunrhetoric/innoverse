import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Proposal, Problem } from "@innoverse/database";
import { uploadPublic } from "@/lib/storage";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";

    // JSON path: file was uploaded straight to Blob from the browser.
    if (contentType.includes("application/json")) {
      const body = await req.json();
      return submitProposal({
        session,
        problemId: body?.problemId,
        description: body?.description,
        pptUrl: body?.pptUrl,
      });
    }

    const formData = await req.formData();
    const file = formData.get("proposalFile") as File | null;

    if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) {
      return NextResponse.json({ message: "Proposal file is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const MAX_BYTES = 15 * 1024 * 1024;
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ message: "Proposal file must be under 15MB" }, { status: 400 });
    }

    const pptUrl = await uploadPublic(
      buffer,
      "uploads",
      file.name || "proposal",
      file.type || "application/octet-stream"
    );

    return submitProposal({
      session,
      problemId: formData.get("problemId") as string,
      description: formData.get("description") as string,
      pptUrl,
    });
  } catch (error: any) {
    console.error("Proposal Submission Error:", error);
    return NextResponse.json({ message: "Error submitting proposal", error: error.message }, { status: 500 });
  }
}

async function submitProposal({
  session,
  problemId,
  description,
  pptUrl,
}: {
  session: any;
  problemId: string;
  description: string;
  pptUrl: string;
}) {
    const studentId = session.user.id;
    const startupId = session.user.role === "Startup" ? session.user.id : null;

    await connectDB();

    const existingProposal = await Proposal.findOne({
      studentId,
      problemId,
      status: "Pending"
    });

    if (existingProposal) {
      return NextResponse.json({
        message: "You have already submitted a proposal for this problem. Please wait for review before reapplying."
      }, { status: 400 });
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return NextResponse.json({ message: "Problem not found" }, { status: 404 });
    }

    if (!pptUrl || typeof pptUrl !== "string" || !/^https?:\/\//.test(pptUrl)) {
      return NextResponse.json({ message: "A valid uploaded file URL is required" }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ message: "Proposal description is required" }, { status: 400 });
    }

    const proposal = await Proposal.create({
      studentId,
      startupId,
      problemId,
      description,
      pptUrl,
      status: "Pending",
      feedback: ""
    });

    return NextResponse.json({ message: "Proposal submitted successfully", proposal }, { status: 201 });
}
