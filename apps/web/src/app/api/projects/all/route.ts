import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Problem } from "@innoverse/database";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const problems = await Problem.find().populate("createdBy", "name email");
    
    return NextResponse.json({ message: "Problems fetched successfully", problems });
  } catch (error: any) {
    return NextResponse.json({ message: "Error fetching problems", error: error.message }, { status: 500 });
  }
}
