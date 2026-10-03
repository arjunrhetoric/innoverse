import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Proposal, Problem } from "@innoverse/database";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const problemId = formData.get("problemId") as string;
    const description = formData.get("description") as string;
    const file = formData.get("proposalFile") as File;

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

    if (!file) {
      return NextResponse.json({ message: "Proposal file is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const proposal = await Proposal.create({
      studentId,
      startupId,
      problemId,
      description,
      pptUrl: `/uploads/${fileName}`,
      status: "Pending",
      feedback: ""
    });

    return NextResponse.json({ message: "Proposal submitted successfully", proposal }, { status: 201 });
  } catch (error: any) {
    console.error("Proposal Submission Error:", error);
    return NextResponse.json({ message: "Error submitting proposal", error: error.message }, { status: 500 });
  }
}
