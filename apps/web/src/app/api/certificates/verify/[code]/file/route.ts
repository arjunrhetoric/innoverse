import { NextRequest, NextResponse } from "next/server";
import { connectDB, Certificate } from "@innoverse/database";
import { readStoredBytes } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Public download of a certificate PDF, addressed by verification code. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    await connectDB();

    const certificate = (await Certificate.findOne({ verificationCode: code })
      .select("certificateFile revoked")
      .lean()) as any;

    if (!certificate?.certificateFile) {
      return NextResponse.json({ message: "Certificate not found" }, { status: 404 });
    }

    const bytes = await readStoredBytes(certificate.certificateFile);

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="innoverse-certificate-${code.slice(0, 8)}.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        ...(certificate.revoked ? { "X-Certificate-Revoked": "true" } : {}),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
