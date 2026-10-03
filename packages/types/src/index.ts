// ─── Data Model Types (matching Mongoose schemas) ───────────────────────────

export interface User {
  _id: string;
  githubId?: string;
  githubUsername?: string;
  name: string;
  email: string;
  accessToken?: string;
  role: "Student" | "Startup" | null;
  githubRepoName?: string | null;
  businessEmail?: string | null;
  companyName?: string | null;
  startupLogo?: string | null;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
  signatureImage?: string | null;
  isVerified: boolean;
  projectsCompleted: number;
  ratings: number[];
}

export interface Problem {
  _id: string;
  title: string;
  description: string;
  skillsRequired: string[];
  createdBy: User | string;
  finalDeadline: string;
  createdAt: string;
  githubRepoUrl?: string;
  githubRepoName?: string;
  githubOwner?: string;
  progress: number;
  completed: boolean;
  completedAt?: string;
}

export interface Proposal {
  _id: string;
  studentId: User | string;
  problemId: Problem | string;
  description: string;
  pptUrl: string;
  status: "Pending" | "Approved" | "Rejected";
  feedback: string;
  submittedAt: string;
  repoUrl?: string;
}

export interface Certificate {
  _id: string;
  studentId: User | string;
  startupId: User | string;
  problemId: Problem | string;
  rating: number;
  review: string;
  certificateFile: string;
  issuedAt: string;
  verificationCode: string;
  evidence?: {
    mergedPRs: number;
    commits: number;
    milestonesCompleted: number;
    milestonesTotal: number;
  };
}

export interface Milestone {
  _id: string;
  repoOwner: string;
  repoName: string;
  title: string;
  description?: string;
  deadline?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  userId?: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface InlineComment {
  _id: string;
  repoOwner: string;
  repoName: string;
  pullNumber: number;
  lineNumber: number;
  comment: string;
  parentComment?: string | null;
  createdBy: User | string;
  createdAt: string;
}

// ─── GitHub API Types ───────────────────────────────────────────────────────

export interface GitHubProfile {
  name: string;
  bio: string;
  avatar: string;
  avatar_url: string;
  url: string;
  html_url: string;
  login: string;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  private: boolean;
  updated_at: string;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  body: string;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  merged_at?: string;
  additions?: number;
  deletions?: number;
  changed_files?: number;
}

// ─── Dashboard Data Types ───────────────────────────────────────────────────

export interface StudentDashboardData {
  user: User;
  problems: Problem[];
  proposals: Proposal[];
  approvedProposals: number;
}

export interface StartupDashboardData {
  user: User;
  challenges: Problem[];
  proposals: Proposal[];
  totalProposals: number;
  pendingReviews: number;
}

export interface ProjectTrackingData {
  user: User;
  role: string;
  pullRequests: PullRequest[] | null;
  progress: number | null;
  milestones: Milestone[];
  problemData: Problem;
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  message?: string;
  data?: T;
}

export interface AuthMeResponse {
  user: User | null;
}
