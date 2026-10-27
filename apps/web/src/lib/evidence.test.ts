import { describe, expect, it } from "vitest";
import { computeConfidence, computeRubricScore, type EvidenceStats } from "./evidence";

const base: EvidenceStats = {
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

describe("computeConfidence", () => {
  it("returns low confidence with no evidence", () => {
    const result = computeConfidence(base);
    expect(result.score).toBeLessThan(45);
    expect(result.level).toBe("low");
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("rewards strong attribution and delivery", () => {
    const result = computeConfidence({
      ...base,
      mergedPRs: 10,
      commits: 100,
      commitsByStudent: 95,
      commitsByOthers: 5,
      milestonesCompleted: 6,
      milestonesTotal: 6,
      reviewsGiven: 5,
      activeDays: 20,
    });
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.level).toBe("high");
  });

  it("caps the score at 100", () => {
    const result = computeConfidence({
      ...base,
      mergedPRs: 50,
      commits: 10,
      commitsByStudent: 10,
      milestonesCompleted: 10,
      milestonesTotal: 10,
      reviewsGiven: 10,
    });
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("flags work authored mostly by others", () => {
    const result = computeConfidence({
      ...base,
      commits: 100,
      commitsByStudent: 5,
      commitsByOthers: 95,
      mergedPRs: 5,
    });
    expect(result.level).toBe("low");
    expect(result.reasons.some((r) => r.includes("commits"))).toBe(true);
  });
});

describe("computeRubricScore", () => {
  it("clamps scores to 1..5", () => {
    const { rows } = computeRubricScore({
      codeQuality: 9,
      delivery: 0,
      communication: 3,
      testing: 4,
    });
    const quality = rows.find((r) => r.key === "codeQuality")!;
    const delivery = rows.find((r) => r.key === "delivery")!;
    expect(quality.score).toBe(5);
    expect(delivery.score).toBe(1);
  });

  it("computes a weighted overall score", () => {
    const { overall } = computeRubricScore({
      codeQuality: 5,
      delivery: 5,
      communication: 5,
      testing: 5,
    });
    expect(overall).toBeCloseTo(5, 2);
  });
});
