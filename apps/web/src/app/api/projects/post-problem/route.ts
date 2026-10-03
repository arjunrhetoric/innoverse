import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Problem, User } from "@innoverse/database";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "Startup") {
      return NextResponse.json({ message: "Unauthorized: Only startups can post challenges" }, { status: 403 });
    }

    const { title, description, skillsRequired, finalDeadline, createGithubRepo, githubRepoName } = await req.json();

    if (!title || !description || !finalDeadline) {
      return NextResponse.json({ message: "Title, description, and deadline are required!" }, { status: 400 });
    }

    if (new Date(finalDeadline) <= new Date()) {
      return NextResponse.json({ message: "Final deadline must be a future date" }, { status: 400 });
    }

    await connectDB();

    let repoUrl = null;
    let githubOwner = null;

    const githubAccessToken = session.accessToken;
    if (createGithubRepo && githubRepoName) {
      try {
        const githubUsername = session.user.githubUsername;
        const response = await axios.post(
          "https://api.github.com/user/repos",
          { name: githubRepoName, private: true, auto_init: true },
          { headers: { Authorization: `Bearer ${githubAccessToken}` } }
        );

        repoUrl = response.data.html_url;
        githubOwner = githubUsername;

        await User.findByIdAndUpdate(session.user.id, { githubRepoName: githubRepoName });
      } catch (error: any) {
        console.error("GitHub Repo Creation Error:", error.response?.data || error.message);
        return NextResponse.json({ message: "Failed to create GitHub repository" }, { status: 500 });
      }
    }

    const problem = await Problem.create({
      title,
      description,
      skillsRequired,
      finalDeadline,
      createdBy: session.user.id,
      githubRepoName: createGithubRepo ? githubRepoName : null,
      githubRepoUrl: repoUrl,
      githubOwner: githubOwner,
    });

    return NextResponse.json({ message: "Problem Statement posted successfully", problem }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: "Error posting problem statement", error: error.message }, { status: 500 });
  }
}
