import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Certificate } from "@innoverse/database";

export async function GET(req: NextRequest, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { studentId } = await params;
    await connectDB();

    const certificates = await Certificate.find({ studentId })
      .populate("startupId", "name")
      .populate("problemId", "title");

    return NextResponse.json(certificates ?? []);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
