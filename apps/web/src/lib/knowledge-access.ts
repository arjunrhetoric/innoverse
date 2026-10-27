import { NextResponse } from "next/server";
import { connectDB, Problem } from "@innoverse/database";
import { isChallengeOwner, requireStartup, type Actor } from "./policy";
import { getGithubToken } from "./github-token";
import mongoose from "mongoose";

export interface KnowledgeAccess {
  problem: any;
  token: string;
}

/**
 * Knowledge base is for the challenge owner (startup):
 * they own the repository context and may ask about it.
 */
export async function requireKnowledgeAccess(
  problemId: string,
  userId: string,
  role: Actor["role"]
): Promise<KnowledgeAccess | NextResponse> {
  if (!mongoose.Types.ObjectId.isValid(problemId)) {
    return NextResponse.json({ message: "Challenge not found" }, { status: 404 });
  }

  const actor: Actor = { id: userId, role };
  const roleCheck = requireStartup(actor);
  if (!roleCheck.allowed) {
    return NextResponse.json({ message: roleCheck.reason }, { status: 403 });
  }

  await connectDB();
  const problem = (await Problem.findById(problemId).lean()) as any;
  if (!problem) {
    return NextResponse.json({ message: "Challenge not found" }, { status: 404 });
  }
  if (!isChallengeOwner(actor, problem)) {
    return NextResponse.json(
      { message: "Only the startup that owns this challenge can use its knowledge base" },
      { status: 403 }
    );
  }
  if (!problem.githubOwner || !problem.githubRepoName) {
    return NextResponse.json(
      { message: "This challenge has no linked GitHub repository" },
      { status: 400 }
    );
  }

  const token = await getGithubToken(userId);
  if (!token) {
    return NextResponse.json(
      { message: "GitHub authorization expired. Please sign in again." },
      { status: 401 }
    );
  }

  return { problem, token };
}
