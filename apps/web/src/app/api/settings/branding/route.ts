import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@innoverse/database";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function toPublicPath(absDir: string, fileName: string) {
  return `/uploads/branding/${fileName}`;
}

async function saveImage(file: File, prefix: string): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Logo and signature must be PNG or JPG images");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Images must be under 5MB");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), "public", "uploads", "branding");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const fileName = `${prefix}-${Date.now()}-${sanitizeFileName(file.name || "image.png")}`;
  fs.writeFileSync(path.join(uploadDir, fileName), buffer);
  return toPublicPath(uploadDir, fileName);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "Startup") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  await connectDB();
  const user = (await User.findById(session.user.id)
    .select("companyName startupLogo signatoryName signatoryTitle signatureImage name")
    .lean()) as any;
  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  const missing: string[] = [];
  if (!user.startupLogo) missing.push("Company logo");
  if (!user.signatureImage) missing.push("Signature image");
  if (!user.signatoryName) missing.push("Signatory name");

  return NextResponse.json({
    companyName: user.companyName ?? null,
    startupLogo: user.startupLogo ?? null,
    signatoryName: user.signatoryName ?? null,
    signatoryTitle: user.signatoryTitle ?? null,
    signatureImage: user.signatureImage ?? null,
    complete: missing.length === 0,
    missing,
  });
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "Startup") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const companyName = (formData.get("companyName") as string | null)?.trim() || null;
    const signatoryName = (formData.get("signatoryName") as string | null)?.trim() || null;
    const signatoryTitle = (formData.get("signatoryTitle") as string | null)?.trim() || null;
    const logo = formData.get("logo") as File | null;
    const signature = formData.get("signature") as File | null;

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    if (logo && typeof logo.arrayBuffer === "function" && logo.size > 0) {
      user.startupLogo = await saveImage(logo, "logo");
    }
    if (signature && typeof signature.arrayBuffer === "function" && signature.size > 0) {
      user.signatureImage = await saveImage(signature, "sign");
    }
    if (companyName !== null) user.companyName = companyName || null;
    if (signatoryName !== null) user.signatoryName = signatoryName || null;
    if (signatoryTitle !== null) user.signatoryTitle = signatoryTitle || null;

    await user.save();
    console.log("Branding saved:", {
      userId: String(session.user.id),
      startupLogo: user.startupLogo ?? null,
      signatureImage: user.signatureImage ?? null,
      signatoryName: user.signatoryName ?? null,
    });

    const missing: string[] = [];
    if (!user.startupLogo) missing.push("Company logo");
    if (!user.signatureImage) missing.push("Signature image");
    if (!user.signatoryName) missing.push("Signatory name");

    return NextResponse.json({
      message: missing.length === 0 ? "Branding kit complete" : "Saved, but still missing: " + missing.join(", "),
      branding: {
        companyName: user.companyName ?? null,
        startupLogo: user.startupLogo ?? null,
        signatoryName: user.signatoryName ?? null,
        signatoryTitle: user.signatoryTitle ?? null,
        signatureImage: user.signatureImage ?? null,
        complete: missing.length === 0,
        missing,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Error saving branding kit" },
      { status: 400 }
    );
  }
}
