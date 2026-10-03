import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import axios from "axios";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.accessToken) {
      return NextResponse.json({ message: "GitHub token missing. Please log in again." }, { status: 401 });
    }

    const response = await axios.get("https://api.github.com/user/repos", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    // The legacy code wrapped repos in { repos: [...] } but then in another place sent response.data directly.
    // The frontend types `GitHubRepo[]` imply it expects an array directly.
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("GitHub API Error:", error.response?.data || error.message);
    return NextResponse.json({ message: "Error fetching GitHub repositories" }, { status: 500 });
  }
}
