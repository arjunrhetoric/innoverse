import { describe, expect, it } from "vitest";
import { ChallengeSchema } from "./challenge-schema";

const base = {
  title: "Build a telemetry dashboard",
  description: "A real-time dashboard with websockets and per-device drilldowns.",
  finalDeadline: "2030-01-01",
  skillsRequired: ["React"],
};

describe("ChallengeSchema", () => {
  it("accepts an empty repo name when repo creation is off (regression)", () => {
    const result = ChallengeSchema.safeParse({
      ...base,
      createGithubRepo: false,
      githubRepoName: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid repo name when creation is on", () => {
    const result = ChallengeSchema.safeParse({
      ...base,
      createGithubRepo: true,
      githubRepoName: "telemetry-dashboard",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing repo name when creation is on", () => {
    const result = ChallengeSchema.safeParse({
      ...base,
      createGithubRepo: true,
      githubRepoName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid repository characters", () => {
    const result = ChallengeSchema.safeParse({
      ...base,
      createGithubRepo: true,
      githubRepoName: "bad name!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short titles and descriptions", () => {
    expect(ChallengeSchema.safeParse({ ...base, title: "Hi" }).success).toBe(false);
    expect(
      ChallengeSchema.safeParse({ ...base, description: "too short" }).success
    ).toBe(false);
  });
});
