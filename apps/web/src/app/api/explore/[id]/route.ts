import { NextRequest, NextResponse } from "next/server";
import { connectDB, Problem } from "@innoverse/database";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/** Public challenge detail (no authentication). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Challenge not found" }, { status: 404 });
    }

    await connectDB();
    const problem = (await Problem.findById(id)
      .select(
        "title description skillsRequired finalDeadline createdBy githubOwner githubRepoName githubRepoUrl githubIssueNumber githubIssueUrl contributionType labels completed"
      )
      .populate("createdBy", "name companyName")
      .lean()) as any;

    if (!problem) {
      return NextResponse.json({ message: "Challenge not found" }, { status: 404 });
    }

    return NextResponse.json({
      challenge: {
        id: String(problem._id),
        title: problem.title,
        description: problem.description,
        skills: problem.skillsRequired ?? [],
        deadline: problem.finalDeadline,
        startup: problem.createdBy?.companyName || problem.createdBy?.name || "Startup",
        contributionType: problem.contributionType ?? "project",
        repo:
          problem.githubOwner && problem.githubRepoName
            ? `${problem.githubOwner}/${problem.githubRepoName}`
            : null,
        repoUrl: problem.githubRepoUrl ?? null,
        issueNumber: problem.githubIssueNumber ?? null,
        issueUrl: problem.githubIssueUrl ?? null,
        labels: problem.labels ?? [],
        completed: Boolean(problem.completed),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
