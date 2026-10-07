import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { put, del } from "@vercel/blob";

export const dynamic = "force-dynamic";

/**
 * Server-side Blob health check. The browser can't read the real Blob API
 * error (failures surface as CORS ghosts), but the server gets full
 * responses — so this pinpoints token/store misconfiguration exactly.
 * Never exposes the token value.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({
        tokenPresent: false,
        message: "BLOB_READ_WRITE_TOKEN is not set in this deployment's runtime environment.",
      });
    }

    const probeName = `innoverse/__healthcheck-${Date.now()}.txt`;
    try {
      const blob = await put(probeName, "innoverse-blob-healthcheck", {
        access: "public",
        contentType: "text/plain",
        token,
      });
      await del(blob.url, { token }).catch(() => null);
      return NextResponse.json({
        tokenPresent: true,
        putOk: true,
        url: blob.url,
        message: "Blob store is reachable and accepting uploads.",
      });
    } catch (err: any) {
      return NextResponse.json({
        tokenPresent: true,
        putOk: false,
        message: err?.message || "Blob put() failed",
        statusCode: err?.statusCode ?? null,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
