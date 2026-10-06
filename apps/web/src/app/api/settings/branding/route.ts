import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@innoverse/database";
import { uploadPublic } from "@/lib/storage";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);

async function saveImage(file: File, prefix: string): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Logo and signature must be PNG or JPG images");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Images must be under 5MB");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadPublic(buffer, "uploads/branding", `${prefix}-${file.name || "image.png"}`, file.type);
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
    const logo = formData.get("logo") as File | string | null;
    const signature = formData.get("signature") as File | string | null;

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const asUrl = (v: File | string | null) =>
      typeof v === "string" && /^https?:\/\//.test(v) ? v : null;
    const asFile = (v: File | string | null) =>
      v && typeof v !== "string" && typeof v.arrayBuffer === "function" && v.size > 0
        ? (v as File)
        : null;

    const logoUrl = asUrl(logo);
    const logoFile = asFile(logo);
    const sigUrl = asUrl(signature);
    const sigFile = asFile(signature);

    if (logoUrl) {
      user.startupLogo = logoUrl;
    } else if (logoFile) {
      user.startupLogo = await saveImage(logoFile, "logo");
    }
    if (sigUrl) {
      user.signatureImage = sigUrl;
    } else if (sigFile) {
      user.signatureImage = await saveImage(sigFile, "sign");
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
