import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Engagement } from "@innoverse/database";
import { canViewEngagement, type Actor } from "@/lib/policy";
import { readStoredBytes } from "@/lib/storage";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/** Download the signed agreement (both parties only). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Contract not found" }, { status: 404 });
    }

    await connectDB();
    const engagement = (await Engagement.findById(id)
      .select("startupId studentId contractFile contractCode")
      .lean()) as any;

    if (!engagement?.contractFile) {
      return NextResponse.json({ message: "Contract not generated yet" }, { status: 404 });
    }

    const actor: Actor = {
      id: session.user.id,
      role: session.user.role as Actor["role"],
    };
    const decision = canViewEngagement(actor, engagement);
    if (!decision.allowed) {
      return NextResponse.json({ message: decision.reason }, { status: 403 });
    }

    const bytes = await readStoredBytes(engagement.contractFile);

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${engagement.contractCode || "agreement"}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
