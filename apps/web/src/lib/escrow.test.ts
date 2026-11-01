import { describe, expect, it } from "vitest";
import {
  applyFund,
  applyRefund,
  applyRelease,
  checkFund,
  checkRefund,
  checkRelease,
  escrowBalance,
  stateOf,
} from "./escrow";

const empty = { fundedAmount: 0, releasedAmount: 0, refundedAmount: 0 };

describe("escrow balance", () => {
  it("is funded minus released and refunded", () => {
    expect(
      escrowBalance({ fundedAmount: 1000, releasedAmount: 300, refundedAmount: 100 })
    ).toBe(600);
  });

  it("avoids floating point drift", () => {
    expect(
      escrowBalance({ fundedAmount: 0.3, releasedAmount: 0.1, refundedAmount: 0.1 })
    ).toBe(0.1);
  });

  it("treats a missing escrow record as empty", () => {
    expect(stateOf(undefined)).toEqual(empty);
    expect(stateOf({})).toEqual(empty);
  });
});

describe("funding", () => {
  it("allows funding an active engagement up to the contract total", () => {
    expect(
      checkFund({ engagementStatus: "Active", totalAmount: 500, state: empty, amount: 500 })
    ).toEqual({ ok: true });
  });

  it("rejects funding beyond the remaining contract value", () => {
    const state = applyFund(empty, 400);
    const check = checkFund({ engagementStatus: "Active", totalAmount: 500, state, amount: 200 });
    expect(check.ok).toBe(false);
  });

  it("rejects funding before the student accepts", () => {
    expect(
      checkFund({ engagementStatus: "Draft", totalAmount: 500, state: empty, amount: 100 }).ok
    ).toBe(false);
  });

  it("rejects zero and negative amounts", () => {
    expect(
      checkFund({ engagementStatus: "Active", totalAmount: 500, state: empty, amount: 0 }).ok
    ).toBe(false);
    expect(
      checkFund({ engagementStatus: "Active", totalAmount: 500, state: empty, amount: -5 }).ok
    ).toBe(false);
  });

  it("rejects funding once fully funded", () => {
    const state = applyFund(empty, 500);
    expect(
      checkFund({ engagementStatus: "Active", totalAmount: 500, state, amount: 1 }).ok
    ).toBe(false);
  });
});

describe("releasing milestone payments", () => {
  it("releases only what escrow holds", () => {
    const state = applyFund(empty, 300);
    expect(checkRelease({ engagementStatus: "Active", amount: 300, state }).ok).toBe(true);
    expect(checkRelease({ engagementStatus: "Active", amount: 301, state }).ok).toBe(false);
  });

  it("reduces the balance when a milestone is paid", () => {
    expect(escrowBalance(applyRelease(applyFund(empty, 300), 120))).toBe(180);
  });

  it("does not release on a completed engagement", () => {
    const state = applyFund(empty, 300);
    expect(checkRelease({ engagementStatus: "Completed", amount: 100, state }).ok).toBe(false);
  });
});

describe("refunds", () => {
  it("returns the unreleased balance once the engagement ends", () => {
    const result = applyRefund(applyRelease(applyFund(empty, 500), 200));
    expect(result.amount).toBe(300);
    expect(escrowBalance(result.state)).toBe(0);
  });

  it("refuses while the engagement is still active", () => {
    const state = applyFund(empty, 500);
    expect(checkRefund({ engagementStatus: "Active", state }).ok).toBe(false);
  });

  it("refuses when nothing is left", () => {
    const state = applyRelease(applyFund(empty, 500), 500);
    expect(checkRefund({ engagementStatus: "Completed", state }).ok).toBe(false);
  });
});
