import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, AuditEvent } from "@innoverse/database";

export const dynamic = "force-dynamic";

/** Audit trail for the signed-in startup (most recent first). */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? 100);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(Math.trunc(limitRaw), 1), 200)
      : 100;

    await connectDB();
    const events = await AuditEvent.find({ actorId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ events });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
