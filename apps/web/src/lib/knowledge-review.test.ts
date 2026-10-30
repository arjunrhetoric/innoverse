import { describe, expect, it } from "vitest";
import { parseReviewPayload } from "./knowledge-review";

describe("parseReviewPayload", () => {
  it("accepts a valid review", () => {
    const parsed = parseReviewPayload({
      verdict: "caution",
      summary: "One risk found.",
      risks: [{ severity: "high", file: "src/auth.ts", issue: "Missing authorization." }],
      checklist: ["Add a test"],
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.verdict).toBe("caution");
    expect(parsed?.risks).toHaveLength(1);
  });

  it("rejects an unknown verdict", () => {
    expect(
      parseReviewPayload({
        verdict: "probably-fine",
        summary: "Looks good",
        risks: [],
        checklist: [],
      })
    ).toBeNull();
  });

  it("normalises unknown severities and null collections", () => {
    const parsed = parseReviewPayload({
      verdict: "safe",
      summary: "No blockers.",
      risks: [{ severity: "critical", issue: "Unknown severity from the model" }],
      checklist: null,
    });
    expect(parsed?.risks[0].severity).toBe("medium");
    expect(parsed?.checklist).toEqual([]);
  });

  it("rejects an empty summary", () => {
    expect(
      parseReviewPayload({ verdict: "safe", summary: "  ", risks: [], checklist: [] })
    ).toBeNull();
  });
});
