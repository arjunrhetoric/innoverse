import type {
  AuthMeResponse,
  StudentDashboardData,
  StartupDashboardData,
  GitHubProfile,
  GitHubRepo,
  Certificate,
  ProjectTrackingData,
} from "./types";

const BASE = "";  // Empty because Next.js rewrites proxy /api/* to Express

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const auth = {
  me: () => request<AuthMeResponse>("/api/auth/me"),

  selectRole: (role: string, businessEmail?: string) =>
    request<{ message: string; redirectPath: string }>("/api/auth/role-selection", {
      method: "POST",
      body: JSON.stringify({ role, businessEmail }),
    }),

  getGitHubProfile: () => request<GitHubProfile>("/api/auth/github/profile"),

  getGitHubRepos: () => request<GitHubRepo[]>("/api/auth/github/repos"),

  logout: async () => {
    const { signOut } = await import("next-auth/react");
    await signOut({ callbackUrl: "/" });
  },
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const dashboard = {
  student: () => request<StudentDashboardData>("/api/dashboard/student"),
  startup: () => request<StartupDashboardData>("/api/dashboard/startup"),
};

// ─── Projects / Problems ─────────────────────────────────────────────────────

export const projects = {
  getAll: () =>
    request<{ message: string; problems: import("./types").Problem[] }>("/api/projects/all"),

  post: (data: {
    title: string;
    description: string;
    skillsRequired: string[];
    finalDeadline: string;
    createGithubRepo: boolean;
    githubRepoName?: string;
  }) =>
    request("/api/projects/post-problem", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (problemId: string) =>
    request(`/api/projects/${problemId}`, { method: "DELETE" }),
};

// ─── Proposals ───────────────────────────────────────────────────────────────

export const proposals = {
  submit: (formData: FormData) =>
    fetch("/api/proposals/submit", {
      method: "POST",
      credentials: "include",
      body: formData, // No JSON content-type for multipart
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || `Request failed: ${res.status}`);
      return data;
    }),

  submitJson: (data: { problemId: string; description: string; pptUrl: string }) =>
    request("/api/proposals/submit", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  review: (proposalId: string, status: string, feedback: string) =>
    request(`/api/proposals/${proposalId}/review`, {
      method: "PATCH",
      body: JSON.stringify({ status, feedback }),
    }),
};

// ─── Certificates ────────────────────────────────────────────────────────────

export const certificates = {
  getForStudent: (studentId: string) =>
    request<Certificate[]>(`/api/certificates/student/${studentId}`),

  getForProblem: (problemId: string) =>
    request<{
      problem: import("./types").Problem;
      approvedProposals: import("./types").Proposal[];
      certificates: Certificate[];
    }>(`/api/certificates/problem/${problemId}`),

  verify: (code: string) =>
    request<{
      valid: boolean;
      message?: string;
      certificate?: {
        studentName: string;
        studentGithub: string | null;
        startupName: string;
        problemTitle: string;
        rating: number;
        review: string;
        issuedAt: string;
        verificationCode: string;
        certificateFile: string;
      };
    }>(`/api/certificates/verify/${encodeURIComponent(code)}`),

  submit: (formData: FormData) =>
    fetch("/api/certificates/submit", {
      method: "POST",
      credentials: "include",
      body: formData,
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Request failed: ${res.status}`);
      return data;
    }),
};

// ─── GitHub / PRs ────────────────────────────────────────────────────────────

export const github = {
  updateReadme: (data: {
    repoOwner: string;
    repoName: string;
    commitMessage: string;
    readmeContent: string;
  }) =>
    request("/api/github/update-readme", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  mergePR: (prNumber: number) =>
    request("/api/github/merge-pr", {
      method: "POST",
      body: JSON.stringify({ prNumber }),
    }),
};

export interface PrIdentifier {
  repoOwner: string;
  repoName: string;
  pullNumber: number | string;
}

function prParams(id: PrIdentifier): string {
  const query = new URLSearchParams({
    repoOwner: id.repoOwner,
    repoName: id.repoName,
    pullNumber: String(id.pullNumber),
  });
  return query.toString();
}

export const pr = {
  getDetails: (id: PrIdentifier) => request(`/api/pr/details?${prParams(id)}`),
  getComments: (id: PrIdentifier) => request(`/api/pr/comments?${prParams(id)}`),
  getCommits: (id: PrIdentifier) => request(`/api/pr/commits?${prParams(id)}`),
  getFiles: (id: PrIdentifier) => request(`/api/pr/files?${prParams(id)}`),
  getReviews: (id: PrIdentifier) => request(`/api/pr/reviews?${prParams(id)}`),
  getDiff: async (id: PrIdentifier) => {
    const res = await fetch(`/api/pr/diff?${prParams(id)}`, {
      credentials: "include",
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || `Request failed: ${res.status}`);
    }
    return res.text();
  },
  postComment: (id: PrIdentifier, comment: string) =>
    request("/api/pr/comment", {
      method: "POST",
      body: JSON.stringify({ ...id, comment }),
    }),
  submitReview: (id: PrIdentifier, event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT", body?: string) =>
    request("/api/pr/reviews", {
      method: "POST",
      body: JSON.stringify({ ...id, event, body }),
    }),
  requestReviewers: (id: PrIdentifier, reviewers: string[]) =>
    request("/api/pr/request-reviewers", {
      method: "POST",
      body: JSON.stringify({ ...id, reviewers }),
    }),
  getInlineComments: (id: PrIdentifier) =>
    request(`/api/pr/inline-comments?${prParams(id)}`),
  postInlineComment: (
    id: PrIdentifier,
    data: { path?: string; line?: number; side?: "LEFT" | "RIGHT"; body: string; commitId?: string; inReplyTo?: number }
  ) =>
    request("/api/pr/inline-comments", {
      method: "POST",
      body: JSON.stringify({ ...id, ...data }),
    }),
  merge: (id: PrIdentifier) =>
    request("/api/pr/merge", { method: "POST", body: JSON.stringify(id) }),
  close: (id: PrIdentifier) =>
    request("/api/pr/close", { method: "PATCH", body: JSON.stringify(id) }),
  reopen: (id: PrIdentifier) =>
    request("/api/pr/reopen", { method: "PATCH", body: JSON.stringify(id) }),
};

// ─── Milestones ──────────────────────────────────────────────────────────────

export const milestones = {
  getAll: (params?: string) => request(`/api/milestones${params ? `?${params}` : ""}`),
  create: (data: object) =>
    request("/api/milestones", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: object) =>
    request(`/api/milestones/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request(`/api/milestones/${id}`, { method: "DELETE" }),
  complete: (id: string) =>
    request(`/api/milestones/${id}/complete`, { method: "PATCH" }),
};

// ─── Notifications ───────────────────────────────────────────────────────────

export const notifications = {
  getAll: () => request<import("./types").Notification[]>("/api/notifications"),
  create: (message: string) =>
    request("/api/notifications", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};

// ─── Project Tracking ────────────────────────────────────────────────────────

export const projectTracking = {
  getData: (id: string) => request<ProjectTrackingData>(`/api/project-tracking/${id}`),

  getProgress: (params?: string) =>
    request(`/api/project/progress${params ? `?${params}` : ""}`),

  getAnalytics: (params: string) => request(`/api/project/analytics?${params}`),

  getTimeline: (params: string) => request(`/api/milestones/timeline?${params}`),
};

// ─── Profile ─────────────────────────────────────────────────────────────────

export const profile = {
  getStudent: (id: string) =>
    request<{
      user: import("./types").User;
      githubProfile: GitHubProfile | null;
      certificates: Certificate[];
    }>(`/api/profile/student/${id}`),
};
