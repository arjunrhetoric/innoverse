import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const dynamic = "force-dynamic";

/**
 * Issues short-lived tokens for browser-direct uploads to Blob.
 * Bypasses the ~4.5MB serverless request-body limit for large decks.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as HandleUploadBody & { probe?: boolean };

    // Lightweight availability probe so the browser can choose between
    // direct upload and the multipart fallback without a cryptic failure.
    if ((body as { probe?: boolean })?.probe) {
      return NextResponse.json({
        directUpload: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      });
    }

    return NextResponse.json(
      await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          const isProposal = pathname.startsWith("innoverse/uploads/");
          const isBranding = pathname.startsWith("innoverse/uploads/branding/");
          if (!isProposal && !isBranding) {
            throw new Error("Upload path not allowed");
          }
          // NOTE: no allowedContentTypes gate. Browser-reported MIME types
          // and real-world file contents (renamed extensions, old .ppt
          // binaries, OS quirks) mismatch too often, and the Blob API
          // answers those mismatches with a CORS-masked 400. The route is
          // auth-gated, path-restricted, and size-capped; every proposal
          // file is human-reviewed by the startup anyway.
          return {
            maximumSizeInBytes: 15 * 1024 * 1024,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({ userId: session.user.id }),
          };
        },
        onUploadCompleted: async () => {},
      })
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Could not issue upload token" },
      { status: 500 }
    );
  }
}
