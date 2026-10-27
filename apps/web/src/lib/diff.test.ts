import { describe, expect, it } from "vitest";
import { parseDiff } from "./diff";

const DIFF = `diff --git a/src/app.ts b/src/app.ts
index 111..222 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,4 @@
 const a = 1;
-const b = 2;
+const b = 3;
+const c = 4;
 export { a };`;

describe("parseDiff", () => {
  it("parses files, hunks and line numbers", () => {
    const files = parseDiff(DIFF);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("src/app.ts");
    expect(files[0].hunks).toHaveLength(1);

    const lines = files[0].hunks[0].lines;
    const adds = lines.filter((l) => l.type === "add");
    const dels = lines.filter((l) => l.type === "del");
    const context = lines.filter((l) => l.type === "context");

    expect(adds).toHaveLength(2);
    expect(dels).toHaveLength(1);
    expect(context).toHaveLength(2);
    expect(adds[0].newNo).toBe(2);
    expect(dels[0].oldNo).toBe(2);
  });

  it("handles multiple files", () => {
    const second = DIFF.split("src/app.ts").join("src/other.ts");
    const files = parseDiff(`${DIFF}\n${second}`);
    expect(files.map((f) => f.path)).toEqual(["src/app.ts", "src/other.ts"]);
  });

  it("returns nothing for empty input", () => {
    expect(parseDiff("")).toEqual([]);
  });
});
