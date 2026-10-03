export interface DiffLine {
  type: "add" | "del" | "context" | "hunk" | "meta";
  oldNo: number | null;
  newNo: number | null;
  text: string;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface FileDiff {
  path: string;
  hunks: DiffHunk[];
}

/** Minimal unified-diff parser for rendering highlighted diffs. */
export function parseDiff(diff: string): FileDiff[] {
  const files: FileDiff[] = [];
  if (!diff) return files;

  let currentFile: FileDiff | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldNo = 0;
  let newNo = 0;

  for (const raw of diff.split("\n")) {
    const fileMatch = raw.match(/^diff --git a\/(.*?) b\/(.*?)\s*$/);
    if (fileMatch) {
      currentFile = { path: fileMatch[2] ?? fileMatch[1], hunks: [] };
      files.push(currentFile);
      currentHunk = null;
      continue;
    }

    if (!currentFile) continue;

    if (raw.startsWith("+++ b/") || raw.startsWith("--- ")) {
      const m = raw.match(/^[+-]{3} [ab]\/(.*)$/);
      if (m?.[1] && currentFile.path !== m[1] && raw.startsWith("+++")) {
        currentFile.path = m[1];
      }
      continue;
    }

    const hunkMatch = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/);
    if (hunkMatch) {
      oldNo = Number(hunkMatch[1]);
      newNo = Number(hunkMatch[2]);
      currentHunk = {
        header: raw,
        lines: [{ type: "hunk", oldNo: null, newNo: null, text: raw }],
      };
      currentFile.hunks.push(currentHunk);
      continue;
    }

    if (!currentHunk) continue;

    const marker = raw[0];
    if (marker === "+") {
      currentHunk.lines.push({ type: "add", oldNo: null, newNo: newNo++, text: raw });
    } else if (marker === "-") {
      currentHunk.lines.push({ type: "del", oldNo: oldNo++, newNo: null, text: raw });
    } else if (marker === "\\") {
      currentHunk.lines.push({ type: "meta", oldNo: null, newNo: null, text: raw });
    } else {
      const text = marker === " " ? raw : ` ${raw}`;
      currentHunk.lines.push({ type: "context", oldNo: oldNo++, newNo: newNo++, text });
    }
  }

  return files.filter((f) => f.hunks.length > 0);
}
