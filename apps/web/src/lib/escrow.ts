/**
 * Ledger-based escrow for paid engagements.
 *
 * Innoverse does not move money yet. The startup records the bank transfer
 * that funds an engagement; the ledger then tracks what is held, released
 * against milestones, and refunded. A payment provider can replace the
 * recording step later without changing these rules.
 */

export interface EscrowState {
  fundedAmount: number;
  releasedAmount: number;
  refundedAmount: number;
}

export type EscrowCheck = { ok: true } | { ok: false; reason: string };

const OK: EscrowCheck = { ok: true };
const fail = (reason: string): EscrowCheck => ({ ok: false, reason });

/** Upper bound for one funding entry, in the engagement's currency. */
export const MAX_ESCROW_AMOUNT = 100_000_000;

export const round2 = (value: number) => Math.round(value * 100) / 100;

/** Read escrow totals from a stored engagement; missing data means nothing funded. */
export function stateOf(
  doc: { escrow?: Partial<EscrowState> | null } | null | undefined
): EscrowState {
  return {
    fundedAmount: round2(doc?.escrow?.fundedAmount ?? 0),
    releasedAmount: round2(doc?.escrow?.releasedAmount ?? 0),
    refundedAmount: round2(doc?.escrow?.refundedAmount ?? 0),
  };
}

export function escrowBalance(state: EscrowState): number {
  return round2(state.fundedAmount - state.releasedAmount - state.refundedAmount);
}

export function checkFund(input: {
  engagementStatus: string;
  totalAmount: number;
  state: EscrowState;
  amount: number;
}): EscrowCheck {
  if (input.engagementStatus !== "Active") {
    return fail("Fund the engagement after the student accepts it");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return fail("Enter a funding amount greater than zero");
  }
  const amount = round2(input.amount);
  if (amount > MAX_ESCROW_AMOUNT) return fail("That funding amount is too large");
  const remaining = round2(input.totalAmount - input.state.fundedAmount);
  if (remaining <= 0) return fail("This engagement is already fully funded");
  if (amount > remaining) {
    return fail(`Funding is capped at the remaining contract value (${remaining.toFixed(2)})`);
  }
  return OK;
}

export function checkRelease(input: {
  engagementStatus: string;
  amount: number;
  state: EscrowState;
}): EscrowCheck {
  if (input.engagementStatus !== "Active") {
    return fail("Only active engagements release escrow");
  }
  const amount = round2(input.amount);
  const balance = escrowBalance(input.state);
  if (amount > balance) {
    return fail(
      `Escrow holds ${balance.toFixed(2)}. Record at least ${(amount - balance).toFixed(
        2
      )} more funding before paying this milestone.`
    );
  }
  return OK;
}

export function checkRefund(input: {
  engagementStatus: string;
  state: EscrowState;
}): EscrowCheck {
  if (input.engagementStatus !== "Completed" && input.engagementStatus !== "Cancelled") {
    return fail("Refunds are available once the engagement is completed or cancelled");
  }
  if (escrowBalance(input.state) <= 0) return fail("Nothing is left in escrow to refund");
  return OK;
}

/** Client-safe summary: totals plus the most recent ledger entries. */
export function escrowView(doc: { escrow?: unknown } | null | undefined) {
  const state = stateOf(doc as { escrow?: Partial<EscrowState> | null } | null | undefined);
  const raw = (doc?.escrow as { ledger?: unknown } | undefined)?.ledger;
  const entries = Array.isArray(raw) ? raw : [];
  return {
    fundedAmount: state.fundedAmount,
    releasedAmount: state.releasedAmount,
    refundedAmount: state.refundedAmount,
    balance: escrowBalance(state),
    ledger: entries
      .slice(-20)
      .reverse()
      .map((entry: any) => ({
        id: String(entry?._id ?? ""),
        type: entry?.type as "fund" | "release" | "refund",
        amount: round2(Number(entry?.amount ?? 0)),
        reference: entry?.reference ?? null,
        milestoneId: entry?.milestoneId ?? null,
        createdAt: entry?.createdAt ?? null,
      })),
  };
}

/**
 * Live escrow balance as a MongoDB aggregation expression, rounded to cents.
 * Used inside conditional updates so the check and the write are one operation.
 */
export function escrowBalanceExpr() {
  return {
    $round: [
      {
        $subtract: [
          { $ifNull: ["$escrow.fundedAmount", 0] },
          {
            $add: [
              { $ifNull: ["$escrow.releasedAmount", 0] },
              { $ifNull: ["$escrow.refundedAmount", 0] },
            ],
          },
        ],
      },
      2,
    ],
  };
}

export function applyFund(state: EscrowState, amount: number): EscrowState {
  return { ...state, fundedAmount: round2(state.fundedAmount + round2(amount)) };
}

export function applyRelease(state: EscrowState, amount: number): EscrowState {
  return { ...state, releasedAmount: round2(state.releasedAmount + round2(amount)) };
}

export function applyRefund(state: EscrowState): { state: EscrowState; amount: number } {
  const amount = escrowBalance(state);
  return {
    state: { ...state, refundedAmount: round2(state.refundedAmount + amount) },
    amount,
  };
}
