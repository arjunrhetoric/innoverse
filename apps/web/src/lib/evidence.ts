import axios from "axios";

export interface EvidenceStats {
  mergedPRs: number;
  prsOpened: number;
  commits: number;
  commitsByStudent: number;
  commitsByOthers: number;
  activeDays: number;
  linesAdded: number;
  linesDeleted: number;
  reviewsGiven: number;
  milestonesCompleted: number;
  milestonesTotal: number;
}

export interface ConfidenceResult {
  score: number;
  level: "high" | "medium" | "low";
  reasons: string[];
}

const EMPTY: EvidenceStats = {
  mergedPRs: 0,
  prsOpened: 0,
  commits: 0,
  commitsByStudent: 0,
  commitsByOthers: 0,
  activeDays: 0,
  linesAdded: 0,
  linesDeleted: 0,
  reviewsGiven: 0,
  milestonesCompleted: 0,
  milestonesTotal: 0,
};

/**
 * Collect the evidence used by the Proof-of-Work Report.
 * Every GitHub failure degrades to zeroes rather than failing issuance.
 */
export async function collectEvidence(
  owner: string | undefined,
  repo: string | undefined,
  username: string | undefined,
  token: string,
  milestones: Array<{ completed?: boolean }>
): Promise<EvidenceStats> {
  const stats: EvidenceStats = {
    ...EMPTY,
    milestonesTotal: milestones.length,
    milestonesCompleted: milestones.filter((m) => m.completed).length,
  };

  if (!owner || !repo || !username) return stats;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const base = `https://api.github.com/repos/${owner}/${encodeURIComponent(repo)}`;
  const login = username.toLowerCase();

  try {
    const merged = (
      await axios.get(`${base}/pulls`, {
        headers,
        params: { state: "closed", per_page: 100 },
      })
    ).data as any[];

    const studentMerged = (Array.isArray(merged) ? merged : []).filter(
      (pr) => pr.merged_at && pr.user?.login?.toLowerCase() === login
    );
    stats.mergedPRs = studentMerged.length;
    stats.linesAdded = studentMerged.reduce((sum, pr) => sum + (pr.additions ?? 0), 0);
    stats.linesDeleted = studentMerged.reduce((sum, pr) => sum + (pr.deletions ?? 0), 0);
  } catch (err) {
    console.error("Evidence: pulls fetch failed", err);
  }

  try {
    const all = (
      await axios.get(`${base}/pulls`, {
        headers,
        params: { state: "all", per_page: 100 },
      })
    ).data as any[];
    stats.prsOpened = (Array.isArray(all) ? all : []).filter(
      (pr) => pr.user?.login?.toLowerCase() === login
    ).length;
  } catch (err) {
    console.error("Evidence: PR author fetch failed", err);
  }

  try {
    const commits = (
      await axios.get(`${base}/commits`, {
        headers,
        params: { author: username, per_page: 100 },
      })
    ).data as any[];
    const list = Array.isArray(commits) ? commits : [];
    stats.commitsByStudent = list.length;
    stats.activeDays = new Set(
      list.map((c) => c.commit?.author?.date?.slice(0, 10)).filter(Boolean)
    ).size;
  } catch (err) {
    console.error("Evidence: commits fetch failed", err);
  }

  try {
    const recent = (
      await axios.get(`${base}/commits`, { headers, params: { per_page: 100 } })
    ).data as any[];
    const list = Array.isArray(recent) ? recent : [];
    stats.commitsByOthers = list.filter(
      (c) =>
        (c.author?.login ?? c.commit?.author?.name ?? "")?.toString().toLowerCase() !== login
    ).length;
    stats.commits = list.length;
  } catch (err) {
    console.error("Evidence: commit sample fetch failed", err);
  }

  try {
    const comments = (
      await axios.get(`${base}/issues/comments`, {
        headers,
        params: { per_page: 100, sort: "created", direction: "desc" },
      })
    ).data as any[];
    stats.reviewsGiven = (Array.isArray(comments) ? comments : []).filter(
      (c) => c.user?.login?.toLowerCase() === login
    ).length;
  } catch (err) {
    console.error("Evidence: review comment fetch failed", err);
  }

  return stats;
}

/**
 * Explainable confidence score, 0–100.
 *
 * The point is not a magic number — it is a number a recruiter can audit:
 * every contribution is printed as a reason.
 */
export function computeConfidence(stats: EvidenceStats): ConfidenceResult {
  const reasons: string[] = [];
  let score = 40;

  const totalCommits = Math.max(stats.commits, stats.commitsByStudent + stats.commitsByOthers);
  const share =
    totalCommits > 0 ? Math.min(stats.commitsByStudent / totalCommits, 1) : 0;

  if (stats.commitsByStudent > 0) {
    const points = Math.round(share * 25);
    score += points;
    reasons.push(
      `${stats.commitsByStudent} of the last ${totalCommits} commits were authored by the student (${Math.round(
        share * 100
      )}% attribution, +${points})`
    );
  } else {
    reasons.push("No commits authored by the student were found");
  }

  if (stats.mergedPRs > 0) {
    const points = Math.round((Math.min(stats.mergedPRs, 5) / 5) * 15);
    score += points;
    reasons.push(`${stats.mergedPRs} merged pull request(s) by the student (+${points})`);
  } else {
    reasons.push("No merged pull requests were found");
  }

  if (stats.milestonesTotal > 0) {
    const ratio = stats.milestonesCompleted / stats.milestonesTotal;
    const points = Math.round(ratio * 10);
    score += points;
    reasons.push(
      `${stats.milestonesCompleted}/${stats.milestonesTotal} milestones completed (+${points})`
    );
  }

  if (stats.reviewsGiven > 0) {
    const points = Math.round((Math.min(stats.reviewsGiven, 3) / 3) * 10);
    score += points;
    reasons.push(`${stats.reviewsGiven} review comment(s) given (+${points})`);
  }

  if (stats.activeDays > 1) {
    reasons.push(`Work spread across ${stats.activeDays} distinct days`);
  }

  score = Math.max(0, Math.min(100, score));
  const level: ConfidenceResult["level"] =
    score >= 75 ? "high" : score >= 45 ? "medium" : "low";

  return { score, level, reasons };
}

export const RUBRIC_CRITERIA = [
  { key: "codeQuality", label: "Code quality", weight: 0.35 },
  { key: "delivery", label: "Delivery & reliability", weight: 0.3 },
  { key: "communication", label: "Communication", weight: 0.2 },
  { key: "testing", label: "Testing & robustness", weight: 0.15 },
] as const;

export type RubricKey = (typeof RUBRIC_CRITERIA)[number]["key"];

export function computeRubricScore(
  scores: Record<string, number>
): { rows: Array<{ key: string; label: string; score: number; weight: number; weighted: number }>; overall: number } {
  const rows = RUBRIC_CRITERIA.map((c) => {
    const raw = Number(scores[c.key]);
    const score = Number.isFinite(raw) ? Math.min(5, Math.max(1, raw)) : 0;
    return {
      key: c.key,
      label: c.label,
      score,
      weight: c.weight,
      weighted: score * c.weight,
    };
  });
  const overall = rows.reduce((sum, r) => sum + r.weighted, 0);
  return { rows, overall: Math.round(overall * 100) / 100 };
}
