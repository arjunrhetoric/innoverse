import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Notification } from "@innoverse/database";
import { z } from "zod";

export const dynamic = "force-dynamic";

const MarkSchema = z.object({
  ids: z.array(z.string()).max(100).optional(),
  all: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const [notifications, unread] = await Promise.all([
      Notification.find({ userId: session.user.id })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      Notification.countDocuments({ userId: session.user.id, read: false }),
    ]);

    return NextResponse.json({ notifications, unread });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

/** Mark specific notifications read, or all of them. */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const parsed = MarkSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    await connectDB();
    const filter: Record<string, unknown> = {
      userId: session.user.id,
      read: false,
    };
    if (!parsed.data.all) {
      if (!parsed.data.ids?.length) {
        return NextResponse.json({ message: "Provide ids or all=true" }, { status: 400 });
      }
      filter._id = { $in: parsed.data.ids };
    }

    await Notification.updateMany(filter, { $set: { read: true } });
    const unread = await Notification.countDocuments({
      userId: session.user.id,
      read: false,
    });

    return NextResponse.json({ message: "Marked read", unread });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
