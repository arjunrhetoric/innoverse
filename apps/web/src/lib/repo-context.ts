import { githubFetch } from "./github";

const MAX_FILES = 8;
const MAX_FILE_CHARS = 12_000;
const MAX_TOTAL_CHARS = 90_000;

const TEXT_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "json", "md", "mdx", "txt",
  "py", "go", "rs", "java", "kt", "rb", "php", "cs", "cpp", "c", "h",
  "css", "scss", "html", "yml", "yaml", "toml", "sql", "sh", "env.example",
]);

function isTextFile(path: string) {
  const name = path.split("/").pop() ?? "";
  if (name.toLowerCase().startsWith("readme")) return true;
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return TEXT_EXTENSIONS.has(ext);
}

const ENTRYPOINT =
  /(^|\/)(index|main|server|app|route|layout|middleware|auth|database|db)\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|kt)$/i;
const SOURCE_DIR = /(^|\/)(src|app|lib|server|api|packages|services)\//i;

function scorePath(path: string, terms: string[]) {
  const lower = path.toLowerCase();
  let score = 0;
  if (lower.includes("readme")) score += 100;
  if (lower.endsWith("package.json")) score += 90;
  for (const term of terms) {
    if (term.length < 3) continue;
    if (lower.includes(term)) score += 10;
  }
  // Keep a useful baseline when the question's words don't match file names.
  if (ENTRYPOINT.test(path)) score += 12;
  else if (SOURCE_DIR.test(path)) score += 3;
  // Prefer source over tests/generated assets.
  if (/(^|\/)(test|tests|__tests__|dist|build|vendor|node_modules)\//.test(lower)) score -= 20;
  return score;
}

export interface RepoContext {
  repo: string;
  files: Array<{ path: string; content: string }>;
  note: string;
}

/**
 * Build a bounded context from a repository: README, manifest, and files whose
 * paths best match the question. Repository content is treated as untrusted
 * data by the prompt (see the callers).
 */
export async function buildRepoContext(
  owner: string,
  repo: string,
  token: string,
  question: string
): Promise<RepoContext> {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9_./-]+/)
    .filter((t) => t.length >= 3);

  let tree: any = null;
  try {
    tree = await githubFetch(
      `https://api.github.com/repos/${owner}/${encodeURIComponent(repo)}/git/trees/HEAD?recursive=1`,
      token
    );
  } catch {
    tree = null;
  }

  const blobs: Array<{ path: string; score: number }> = Array.isArray(tree?.tree)
    ? tree.tree
        .filter((n: any) => n.type === "blob" && isTextFile(n.path))
        .map((n: any) => ({ path: n.path, score: scorePath(n.path, terms) }))
        .filter((n: any) => n.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, MAX_FILES)
    : [{ path: "README.md", score: 100 }];

  const files: Array<{ path: string; content: string }> = [];
  let total = 0;

  for (const blob of blobs) {
    if (total >= MAX_TOTAL_CHARS) break;
    try {
      const data: any = await githubFetch(
        `https://api.github.com/repos/${owner}/${encodeURIComponent(repo)}/contents/${encodeURI(blob.path)}`,
        token
      );
      if (data?.type !== "file" || typeof data.content !== "string") continue;
      const content = Buffer.from(data.content, "base64")
        .toString("utf8")
        .slice(0, MAX_FILE_CHARS);
      files.push({ path: blob.path, content });
      total += content.length;
    } catch {
      // Skip unreadable files.
    }
  }

  return {
    repo: `${owner}/${repo}`,
    files,
    note: tree ? "" : "Repository tree unavailable; only a best-effort README was loaded.",
  };
}

export interface PrReviewContext {
  repo: string;
  pullNumber: number;
  title: string;
  body: string;
  files: Array<{ filename: string; status: string; additions: number; deletions: number; patch?: string }>;
}

/** PR metadata plus patches, bounded. */
export async function buildPrContext(
  owner: string,
  repo: string,
  pullNumber: number,
  token: string
): Promise<PrReviewContext> {
  const base = `https://api.github.com/repos/${owner}/${encodeURIComponent(repo)}`;
  const [details, files] = await Promise.all([
    githubFetch(`${base}/pulls/${pullNumber}`, token),
    githubFetch(`${base}/pulls/${pullNumber}/files?per_page=100`, token),
  ]);

  const changed = (Array.isArray(files) ? files : []).map((f: any) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions ?? 0,
    deletions: f.deletions ?? 0,
    patch: typeof f.patch === "string" ? f.patch.slice(0, 4000) : undefined,
  }));

  return {
    repo: `${owner}/${repo}`,
    pullNumber,
    title: details?.title ?? "",
    body: details?.body ?? "",
    files: changed,
  };
}
