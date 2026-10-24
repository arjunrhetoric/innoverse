import { describe, expect, it } from "vitest";
import {
  canCreateChallenge,
  canDeleteChallenge,
  canIssueCertificate,
  canManageMilestones,
  canReviewProposal,
  canRevokeCertificate,
  type Actor,
} from "./policy";

const owner: Actor = { id: "u1", role: "Startup", isVerified: true };
const otherStartup: Actor = { id: "u2", role: "Startup", isVerified: true };
const student: Actor = { id: "s1", role: "Student" };
const unverified: Actor = { id: "u1", role: "Startup", isVerified: false };

const challenge = { createdBy: "u1" };

describe("proposal review authorization (IDOR regression)", () => {
  it("allows the challenge owner", () => {
    expect(canReviewProposal(owner, challenge).allowed).toBe(true);
  });

  it("rejects a different startup", () => {
    const decision = canReviewProposal(otherStartup, challenge);
    expect(decision.allowed).toBe(false);
  });

  it("rejects students", () => {
    expect(canReviewProposal(student, challenge).allowed).toBe(false);
  });
});

describe("challenge ownership", () => {
  it("only the owner may delete", () => {
    expect(canDeleteChallenge(owner, challenge).allowed).toBe(true);
    expect(canDeleteChallenge(otherStartup, challenge).allowed).toBe(false);
  });
});

describe("verification gates", () => {
  it("blocks unverified startups from creating challenges", () => {
    expect(canCreateChallenge(unverified).allowed).toBe(false);
    expect(canCreateChallenge(owner).allowed).toBe(true);
  });

  it("blocks unverified startups from issuing certificates", () => {
    expect(canIssueCertificate(unverified, challenge).allowed).toBe(false);
    expect(canIssueCertificate(owner, challenge).allowed).toBe(true);
  });
});

describe("milestones and revocation", () => {
  it("only the owner manages milestones", () => {
    expect(canManageMilestones(owner, challenge).allowed).toBe(true);
    expect(canManageMilestones(student, challenge).allowed).toBe(false);
  });

  it("only the issuing startup can revoke", () => {
    const certificate = { startupId: "u1" };
    expect(canRevokeCertificate(owner, certificate).allowed).toBe(true);
    expect(canRevokeCertificate(otherStartup, certificate).allowed).toBe(false);
  });
});
