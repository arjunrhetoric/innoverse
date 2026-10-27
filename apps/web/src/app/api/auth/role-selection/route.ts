import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@innoverse/database";
import validateCompanyEmail from "company-email-validator";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { testBypassEnabled } from "@/lib/flags";

const RoleSchema = z.object({
  role: z.enum(["Student", "Startup", "Institution"]),
  businessEmail: z.string().trim().email().max(254).optional(),
});

/** Local development escape hatch — never active in production. */
function bypassEnabled() {
  return testBypassEnabled();
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "User not authenticated" }, { status: 401 });
    }

    const limited = await checkRateLimit(`role:${session.user.id}`, 10, 60);
    if (!limited.ok) return rateLimitResponse(limited);

    const parsed = RoleSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid role selection", issues: parsed.error.issues.map((i) => i.message) },
        { status: 400 }
      );
    }
    const { role } = parsed.data;
    let businessEmail = parsed.data.businessEmail;

    let isVerified = false;

    if (role === "Startup") {
      if (!businessEmail) {
        if (!bypassEnabled()) {
          return NextResponse.json(
            { message: "A business email is required to register as a startup" },
            { status: 400 }
          );
        }
        businessEmail = "dev-bypass@example.com";
      }

      const isBusinessEmail = validateCompanyEmail.isCompanyEmail(businessEmail);
      if (!isBusinessEmail && !bypassEnabled()) {
        return NextResponse.json({ message: "Invalid Business Email Address" }, { status: 400 });
      }
      // A bypassed account is explicitly NOT verified.
      isVerified = isBusinessEmail;
    }

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    user.role = role;
    user.isVerified = isVerified;
    if (role === "Startup") {
      user.businessEmail = businessEmail || null;
    }

    await user.save();

    await audit({
      actorId: String(user._id),
      actorName: user.name,
      action: "role.selected",
      resourceType: "User",
      resourceId: String(user._id),
      metadata: { role, isVerified },
      request: req,
    });

    const redirectPath =
      role === "Student"
        ? "/dashboard/student"
        : role === "Startup"
          ? "/dashboard/startup"
          : "/dashboard/institution";
    return NextResponse.json({
      message:
        role === "Student" || isVerified
          ? "Role selected successfully"
          : role === "Institution"
            ? "Institution account created"
            : "Role selected, but your startup is unverified until a valid business email is provided",
      redirectPath,
      isVerified,
    });
  } catch (error: any) {
    return NextResponse.json({ message: "Error selecting role", err: error.message }, { status: 500 });
  }
}
