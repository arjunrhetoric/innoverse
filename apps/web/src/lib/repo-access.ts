import { NextResponse } from "next/server";
import { connectDB, Problem, Proposal } from "@innoverse/database";
import mongoose from "mongoose";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Product-level authorization for the PR proxy routes.
 *
 * Reads use the caller's own GitHub token, so they stay auth-only.
 * Writes must target an Innoverse-managed repo (a Problem with matching
 * githubOwner/githubRepoName):
 * - "participant": the challenge creator or a student with an Approved
 *   proposal on it (commenting, inline comments, COMMENT reviews).
 * - "maintainer": only the challenge creator (merge, close, reopen,
 *   requesting reviewers, APPROVE / REQUEST_CHANGES reviews).
 */
export async function requireRepoRole(
  owner: string,
  repo: string,
  userId: string,
  role: "participant" | "maintainer"
): Promise<{ problems: any[] } | NextResponse> {
  await connectDB();

  let problems = (await Problem.find({
    githubOwner: owner,
    githubRepoName: repo,
  })
    .select("_id createdBy")
    .lean()) as any[];

  if (!problems.length) {
    problems = (await Problem.find({
      githubOwner: { $regex: `^${escapeRegExp(owner)}$`, $options: "i" },
      githubRepoName: { $regex: `^${escapeRegExp(repo)}$`, $options: "i" },
    })
      .select("_id createdBy")
      .lean()) as any[];
  }

  if (!problems.length) {
    return NextResponse.json(
      { message: "This repository is not linked to any Innoverse challenge" },
      { status: 403 }
    );
  }

  const isCreator = problems.some(
    (p) => String(p.createdBy) === String(userId)
  );
  if (isCreator) return { problems };

  if (role === "maintainer") {
    return NextResponse.json(
      { message: "Only the challenge owner can perform this action" },
      { status: 403 }
    );
  }

  const approved = await Proposal.exists({
    problemId: { $in: problems.map((p) => p._id) },
    studentId: userId,
    status: "Approved",
  });

  if (!approved) {
    return NextResponse.json(
      { message: "Only the challenge owner or approved contributors can comment here" },
      { status: 403 }
    );
  }

  return { problems };
}

/**
 * Milestones belong to the challenge owner. Students can read them on the
 * tracking page, but only the startup that posted the challenge may create,
 * edit, complete, or delete them.
 */
export async function requireMilestoneOwner(
  input: { problemId?: string | null; repoOwner?: string | null; repoName?: string | null },
  userId: string
): Promise<{ problem: any } | NextResponse> {
  await connectDB();

  if (input.problemId) {
    if (!mongoose.Types.ObjectId.isValid(input.problemId)) {
      return NextResponse.json({ message: "Challenge not found" }, { status: 404 });
    }
    const problem = (await Problem.findById(input.problemId).select(
      "_id createdBy githubOwner githubRepoName"
    )) as any;
    if (!problem) {
      return NextResponse.json({ message: "Challenge not found" }, { status: 404 });
    }
    if (String(problem.createdBy) !== String(userId)) {
      return NextResponse.json(
        { message: "Only the startup that posted this challenge can manage milestones" },
        { status: 403 }
      );
    }
    return { problem };
  }

  if (input.repoOwner && input.repoName) {
    const access = await requireRepoRole(input.repoOwner, input.repoName, userId, "maintainer");
    if (access instanceof NextResponse) return access;
    return { problem: access.problems[0] };
  }

  return NextResponse.json(
    { message: "A challenge or repository scope is required" },
    { status: 400 }
  );
}
