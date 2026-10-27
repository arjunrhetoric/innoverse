import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, User } from "@innoverse/database";
import { audit } from "@/lib/audit";
import { z } from "zod";

const ProfileSchema = z.object({
  headline: z.string().trim().max(120).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  location: z.string().trim().max(80).optional(),
  profilePublic: z.boolean().optional(),
});

/** Student-controlled public profile settings. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "Student") {
    return NextResponse.json({ message: "Only students have a talent profile" }, { status: 403 });
  }

  await connectDB();
  const user = (await User.findById(session.user.id)
    .select("headline skills location profilePublic name githubUsername")
    .lean()) as any;
  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  return NextResponse.json({
    profile: {
      name: user.name,
      githubUsername: user.githubUsername ?? null,
      headline: user.headline ?? null,
      skills: user.skills ?? [],
      location: user.location ?? null,
      profilePublic: Boolean(user.profilePublic),
    },
  });
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "Student") {
      return NextResponse.json({ message: "Only students have a talent profile" }, { status: 403 });
    }

    const parsed = ProfileSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid profile", issues: parsed.error.issues.map((i) => i.message) },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const { headline, skills, location, profilePublic } = parsed.data;
    if (headline !== undefined) user.headline = headline || null;
    if (location !== undefined) user.location = location || null;
    if (skills !== undefined) user.skills = skills;
    if (profilePublic !== undefined) user.profilePublic = profilePublic;
    await user.save();

    await audit({
      actorId: String(user._id),
      actorName: user.name,
      action: "profile.updated",
      resourceType: "User",
      resourceId: String(user._id),
      metadata: { profilePublic: Boolean(user.profilePublic) },
      request: req,
    });

    return NextResponse.json({
      message: user.profilePublic
        ? "Profile is live in the public talent directory"
        : "Profile is private",
      profile: {
        headline: user.headline ?? null,
        skills: user.skills ?? [],
        location: user.location ?? null,
        profilePublic: Boolean(user.profilePublic),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
