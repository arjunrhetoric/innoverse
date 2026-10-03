
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectDB, Milestone, Problem } from "@innoverse/database";
import { requireMilestoneOwner } from "@/lib/repo-access";
import { emitMilestone } from "@/lib/realtime";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { repoOwner, repoName } = Object.fromEntries(req.nextUrl.searchParams);
    if (!repoOwner || !repoName) return NextResponse.json({ message: "Missing params" }, { status: 400 });

    await connectDB();
    const milestones = await Milestone.find({ repoOwner, repoName }).sort({ deadline: 1 });
    return NextResponse.json(milestones);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { problemId, title, description, deadline, repoOwner, repoName } = await req.json();
    if (!title || !String(title).trim()) {
      return NextResponse.json({ message: "Title is required" }, { status: 400 });
    }

    const access = await requireMilestoneOwner({ problemId, repoOwner, repoName }, session.user.id);
    if (access instanceof NextResponse) return access;

    await connectDB();

    // If problemId is provided, look up the repo info from the Problem
    let owner = repoOwner;
    let repo = repoName;
    let resolvedProblemId = problemId;
    if (problemId && (!owner || !repo)) {
      const problem = await Problem.findById(problemId).lean() as any;
      if (problem) {
        owner = owner || problem.githubOwner;
        repo = repo || problem.githubRepoName;
      }
    }

    const milestone = await Milestone.create({
      problemId: resolvedProblemId,
      repoOwner: owner,
      repoName: repo,
      title,
      description,
      deadline,
    });

    void emitMilestone(milestone.toObject?.() ?? milestone, "created", {
      id: session.user.id,
      name: session.user.name,
    });

    return NextResponse.json({ message: "Milestone created", milestone }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
