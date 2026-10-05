/** Client-safe channel helpers (no node imports — safe for the browser bundle). */

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
