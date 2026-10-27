import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Shortlist } from "@innoverse/database";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Remove a student from the startup's shortlist. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "Startup") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { studentId } = await params;
    await connectDB();

    const result = await Shortlist.findOneAndDelete({
      startupId: session.user.id,
      studentId,
    });

    if (!result) {
      return NextResponse.json({ message: "Not in your shortlist" }, { status: 404 });
    }

    await audit({
      actorId: session.user.id,
      actorName: session.user.name ?? null,
      action: "talent.shortlist_removed",
      resourceType: "Shortlist",
      resourceId: String(result._id),
      metadata: { studentId },
      request: req,
    });

    return NextResponse.json({ message: "Removed from shortlist" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
