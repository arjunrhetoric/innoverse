import { NextRequest, NextResponse } from "next/server";
import { connectDB, User } from "@innoverse/database";
import { hashPassword, passwordProblem } from "@/lib/password";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { z } from "zod";

const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(120),
  institutionName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(200),
});

/** Institution self-registration with email + password. */
export async function POST(req: NextRequest) {
  try {
    const limit = await checkRateLimit(`register:${req.headers.get("x-forwarded-for") ?? "local"}`, 10, 600);
    if (!limit.ok) return rateLimitResponse(limit);

    const parsed = RegisterSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid registration", issues: parsed.error.issues.map((i) => i.message) },
        { status: 400 }
      );
    }

    const problem = passwordProblem(parsed.data.password);
    if (problem) {
      return NextResponse.json({ message: problem }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();

    await connectDB();
    const existing = await User.findOne({ email }).select("_id");
    if (existing) {
      return NextResponse.json(
        { message: "An account with this email already exists. Try signing in." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const user = await User.create({
      name: parsed.data.name,
      email,
      role: "Institution",
      isVerified: true,
      companyName: parsed.data.institutionName,
      passwordHash,
    });

    await audit({
      actorId: String(user._id),
      actorName: user.name,
      action: "institution.registered",
      resourceType: "User",
      resourceId: String(user._id),
      metadata: { institutionName: parsed.data.institutionName },
      request: req,
    });

    return NextResponse.json(
      { message: "Institution account created", email },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
