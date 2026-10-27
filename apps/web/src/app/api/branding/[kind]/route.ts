import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@innoverse/database";
import { readStoredBytes } from "@/lib/storage";
import { detectType } from "@/lib/file-signature";

export const dynamic = "force-dynamic";

/** Owner-only preview of branding assets (logo / signature). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kind: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "Startup") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { kind } = await params;
    if (kind !== "logo" && kind !== "signature") {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    await connectDB();
    const user = (await User.findById(session.user.id)
      .select("startupLogo signatureImage")
      .lean()) as any;

    const source = kind === "logo" ? user?.startupLogo : user?.signatureImage;
    if (!source) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const bytes = await readStoredBytes(source);
    const type = detectType(bytes.subarray(0, 16));
    const contentType = type === "png" ? "image/png" : type === "jpeg" ? "image/jpeg" : "application/octet-stream";

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
