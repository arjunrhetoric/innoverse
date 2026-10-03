import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Certificate, User } from "@innoverse/database";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    await connectDB();

    const user = (await User.findById(id).select("-accessToken").lean()) as any;
    if (!user) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    const certificates = await Certificate.find({ studentId: id })
      .populate("startupId", "name")
      .populate("problemId", "title")
      .lean();

    let githubProfile = null;
    if (user.githubUsername) {
      try {
        const res = await fetch(
          `https://api.github.com/users/${encodeURIComponent(user.githubUsername)}`,
          {
            headers: {
              Accept: "application/vnd.github+json",
              "User-Agent": "innoverse",
            },
            cache: "no-store",
          }
        );
        if (res.ok) {
          const data = await res.json();
          githubProfile = {
            name: data.name || data.login,
            bio: data.bio || "",
            avatar: data.avatar_url,
            avatar_url: data.avatar_url,
            url: data.url,
            html_url: data.html_url,
            login: data.login,
            public_repos: data.public_repos ?? 0,
            followers: data.followers ?? 0,
            following: data.following ?? 0,
          };
        }
      } catch (err) {
        console.error("Public GitHub profile fetch failed:", err);
      }
    }

    return NextResponse.json({
      user,
      githubProfile,
      certificates,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
