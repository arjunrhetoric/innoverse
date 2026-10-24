import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Certificate } from "@innoverse/database";
import { canRevokeCertificate, type Actor } from "@/lib/policy";
import { audit } from "@/lib/audit";
import { z } from "zod";

const RevokeSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

/** Revoke an issued certificate. Only the issuing startup may do this. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const parsed = RevokeSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "A revocation reason of at least 5 characters is required" },
        { status: 400 }
      );
    }

    const { id } = await params;
    await connectDB();

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return NextResponse.json({ message: "Certificate not found" }, { status: 404 });
    }

    const actor: Actor = {
      id: session.user.id,
      role: session.user.role as Actor["role"],
    };
    const decision = canRevokeCertificate(actor, certificate);
    if (!decision.allowed) {
      return NextResponse.json({ message: decision.reason }, { status: 403 });
    }

    if (certificate.revoked) {
      return NextResponse.json({ message: "Certificate is already revoked", certificate });
    }

    certificate.revoked = true;
    certificate.revokedAt = new Date();
    certificate.revokedBy = session.user.id as any;
    certificate.revocationReason = parsed.data.reason;
    await certificate.save();

    await audit({
      actorId: actor.id,
      actorName: session.user.name ?? null,
      action: "certificate.revoked",
      resourceType: "Certificate",
      resourceId: String(certificate._id),
      metadata: { reason: parsed.data.reason },
      request: req,
    });

    return NextResponse.json({ message: "Certificate revoked", certificate });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
