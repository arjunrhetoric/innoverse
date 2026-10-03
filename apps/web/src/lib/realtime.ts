import { publish } from "./bus";

export interface RealtimeEvent {
  type: "pr" | "milestone" | "certificate";
  action: string;
  actorId?: string;
  actorName?: string | null;
  pullNumber?: number | string;
  milestoneId?: string;
  [key: string]: unknown;
}

export function prChannel(owner: string, repo: string, pullNumber: number | string) {
  return `pr:${owner}/${repo}/${pullNumber}`;
}

export function projectChannel(problemId: string) {
  return `project:${problemId}`;
}

/** Publish to the PR channel and to every linked challenge channel. */
export async function emitPr(
  owner: string,
  repo: string,
  pullNumber: number | string,
  event: { action: string; actorId?: string; actorName?: string | null; [key: string]: unknown }
) {
  const { action, actorId, actorName, ...rest } = event;
  const full: RealtimeEvent = { ...rest, action, actorId, actorName, type: "pr", pullNumber };
  publish(prChannel(owner, repo, pullNumber), full);
  await emitForRepoProblems(owner, repo, full);
}

/** Publish to every challenge channel linked to a repo. Never throws. */
export async function emitForRepoProblems(
  owner: string,
  repo: string,
  event: RealtimeEvent
) {
  try {
    const { connectDB, Problem } = await import("@innoverse/database");
    await connectDB();
    const problems = (await Problem.find({
      githubOwner: owner,
      githubRepoName: repo,
    })
      .select("_id")
      .lean()) as any[];
    for (const p of problems) {
      publish(projectChannel(String(p._id)), event);
    }
  } catch (err) {
    console.error("Realtime publish failed:", err);
  }
}

/** Publish a milestone change to its challenge channel(s). Never throws. */
export async function emitMilestone(
  milestone: { problemId?: unknown; repoOwner?: string; repoName?: string; _id?: unknown },
  action: string,
  actor: { id?: string; name?: string | null }
) {
  try {
    const event: RealtimeEvent = {
      type: "milestone",
      action,
      actorId: actor.id,
      actorName: actor.name,
      milestoneId: milestone._id ? String(milestone._id) : undefined,
    };
    const problemId = milestone.problemId ? String(milestone.problemId) : null;
    if (problemId) publish(projectChannel(problemId), event);
    if (milestone.repoOwner && milestone.repoName) {
      await emitForRepoProblems(milestone.repoOwner, milestone.repoName, event);
    }
  } catch (err) {
    console.error("Realtime publish failed:", err);
  }
}
