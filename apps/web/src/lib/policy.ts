/**
 * One place to answer "may this person do this?".
 *
 * Route handlers should not invent their own comparisons — scattered checks
 * are how object-level authorization bugs appear. Every rule below is
 * intentionally small and testable.
 */

export interface Actor {
  id: string;
  role: "Student" | "Startup" | null;
  isVerified?: boolean;
}

export type Decision = { allowed: true } | { allowed: false; reason: string };

const allow: Decision = { allowed: true };
const deny = (reason: string): Decision => ({ allowed: false, reason });

function sameId(a: unknown, b: unknown) {
  return Boolean(a) && Boolean(b) && String(a) === String(b);
}

/** Challenge owner (the startup account that created it). */
export function isChallengeOwner(actor: Actor, challenge: { createdBy: unknown }): boolean {
  return sameId(actor.id, challenge.createdBy);
}

/** Posting, reviewing, issuing — startup-only actions. */
export function requireStartup(actor: Actor): Decision {
  if (actor.role !== "Startup") return deny("Only startup accounts can perform this action");
  return allow;
}

/** Certificate integrity: unverified startups cannot mint credentials. */
export function requireVerifiedStartup(actor: Actor): Decision {
  const role = requireStartup(actor);
  if (!role.allowed) return role;
  if (!actor.isVerified) return deny("Verify your startup with a business email first");
  return allow;
}

export function canCreateChallenge(actor: Actor): Decision {
  return requireVerifiedStartup(actor);
}

export function canDeleteChallenge(
  actor: Actor,
  challenge: { createdBy: unknown }
): Decision {
  const role = requireStartup(actor);
  if (!role.allowed) return role;
  if (!isChallengeOwner(actor, challenge)) return deny("Only the challenge owner can delete it");
  return allow;
}

export function canReviewProposal(
  actor: Actor,
  challenge: { createdBy: unknown }
): Decision {
  const role = requireStartup(actor);
  if (!role.allowed) return role;
  if (!isChallengeOwner(actor, challenge)) {
    return deny("Only the startup that posted this challenge can review its proposals");
  }
  return allow;
}

export function canManageMilestones(
  actor: Actor,
  challenge: { createdBy: unknown }
): Decision {
  const role = requireStartup(actor);
  if (!role.allowed) return role;
  if (!isChallengeOwner(actor, challenge)) {
    return deny("Only the startup that posted this challenge can manage milestones");
  }
  return allow;
}

export function canIssueCertificate(
  actor: Actor,
  challenge: { createdBy: unknown }
): Decision {
  const role = requireVerifiedStartup(actor);
  if (!role.allowed) return role;
  if (!isChallengeOwner(actor, challenge)) {
    return deny("Only the startup that posted this challenge can issue certificates");
  }
  return allow;
}

export function canRevokeCertificate(
  actor: Actor,
  certificate: { startupId: unknown }
): Decision {
  const role = requireStartup(actor);
  if (!role.allowed) return role;
  if (!sameId(actor.id, certificate.startupId)) {
    return deny("Only the startup that issued this certificate can revoke it");
  }
  return allow;
}

/** Approved contributors may comment on PRs for the challenge they won. */
export function isApprovedContributorFlag(value: boolean): Decision {
  return value
    ? allow
    : deny("Only the challenge owner or approved contributors can comment here");
}
