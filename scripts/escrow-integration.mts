// Throwaway check for the escrow mutations against a real MongoDB.
// Uses its own database and drops it at the end; the dev database is untouched.
import Engagement from "../packages/database/src/models/Engagement.ts";
import { applyRefund, escrowBalance, escrowBalanceExpr, round2, stateOf } from "../apps/web/src/lib/escrow.ts";

const M = Engagement as any;
const { ObjectId } = M.base.Types;
const URI = "mongodb://127.0.0.1:27017/innoverse_escrow_check";

let failures = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures += 1;
};

// Same queries as the routes, with the same conditions.
async function fund(id: unknown, amount: number, reference: string) {
  return M.findOneAndUpdate(
    {
      _id: id,
      status: "Active",
      $expr: {
        $lte: [
          { $round: [{ $add: [{ $ifNull: ["$escrow.fundedAmount", 0] }, amount] }, 2] },
          { $round: ["$totalAmount", 2] },
        ],
      },
    },
    {
      $inc: { "escrow.fundedAmount": amount },
      $push: {
        "escrow.ledger": { type: "fund", amount, reference, milestoneId: null, actorId: null, createdAt: new Date() },
      },
    },
    { new: true }
  );
}

async function pay(id: unknown, milestoneId: unknown, amount: number) {
  return M.findOneAndUpdate(
    {
      _id: id,
      status: "Active",
      milestones: { $elemMatch: { _id: milestoneId, status: "Delivered" } },
      $expr: { $gte: [escrowBalanceExpr(), amount] },
    },
    {
      $set: {
        "milestones.$[m].status": "Paid",
        "milestones.$[m].paidAt": new Date(),
        "milestones.$[m].paidReference": "REF",
      },
      $inc: { "escrow.releasedAmount": amount },
      $push: {
        "escrow.ledger": {
          type: "release",
          amount,
          reference: "REF",
          milestoneId: String(milestoneId),
          actorId: null,
          createdAt: new Date(),
        },
      },
    },
    { new: true, arrayFilters: [{ "m._id": milestoneId, "m.status": "Delivered" }] }
  );
}

async function refund(id: unknown) {
  const doc: any = await M.findById(id).lean();
  const state = stateOf(doc);
  const ended = doc.status === "Completed" || doc.status === "Cancelled";
  if (!ended || escrowBalance(state) <= 0) return null;
  const { state: next, amount } = applyRefund(state);
  return M.findOneAndUpdate(
    {
      _id: id,
      status: { $in: ["Completed", "Cancelled"] },
      "escrow.fundedAmount": { $in: [state.fundedAmount, null] },
      "escrow.releasedAmount": { $in: [state.releasedAmount, null] },
      "escrow.refundedAmount": { $in: [state.refundedAmount, null] },
    },
    {
      $set: { "escrow.refundedAmount": next.refundedAmount },
      $push: {
        "escrow.ledger": { type: "refund", amount, reference: null, milestoneId: null, actorId: null, createdAt: new Date() },
      },
    },
    { new: true }
  );
}

async function insert(overrides: Record<string, unknown>) {
  const _id = new ObjectId();
  await M.collection.insertOne({
    _id,
    problemId: new ObjectId(),
    startupId: new ObjectId(),
    studentId: new ObjectId(),
    title: "check",
    currency: "INR",
    description: "",
    ipAssignmentAccepted: true,
    milestones: [],
    status: "Active",
    escrow: { fundedAmount: 0, releasedAmount: 0, refundedAmount: 0, ledger: [] },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
  return _id;
}

const milestone = (title: string, amount: number, status: string) => ({
  _id: new ObjectId(),
  title,
  amount,
  status,
  dueDate: null,
  evidenceUrl: null,
  deliveredAt: null,
  paidAt: null,
  paidReference: null,
  confirmedAt: null,
});

await M.db.openUri(URI, { serverSelectionTimeoutMS: 5000 });
const info = await M.db.db.admin().serverInfo();
console.log(`MongoDB ${info.version} · database innoverse_escrow_check`);
await M.db.db.dropDatabase();

try {
  // A: funding cap, concurrent funding, concurrent pays, balance limits.
  const m1 = milestone("M1", 200, "Delivered");
  const m2 = milestone("M2", 200, "Delivered");
  const m3 = milestone("M3", 100, "Delivered");
  const m4 = milestone("M4", 50, "Pending");
  const A = await insert({ totalAmount: 500, milestones: [m1, m2, m3, m4] });

  check("fund 300 of 500 succeeds", (await fund(A, 300, "F1")) !== null);
  check("funding beyond the total is refused", (await fund(A, 300, "F2")) === null);

  const [f1, f2] = await Promise.all([fund(A, 200, "F3"), fund(A, 200, "F4")]);
  check("two concurrent fundings: exactly one applies", [f1, f2].filter(Boolean).length === 1);
  const afterFunding: any = await M.findById(A).lean();
  check("funded total stops at 500", afterFunding.escrow.fundedAmount === 500);

  const [p1, p2] = await Promise.all([pay(A, m1._id, 200), pay(A, m1._id, 200)]);
  check("two concurrent pays of one milestone: exactly one applies", [p1, p2].filter(Boolean).length === 1);
  const afterPay: any = await M.findById(A).lean();
  const m1Releases = afterPay.escrow.ledger.filter((e: any) => e.type === "release" && e.milestoneId === String(m1._id));
  check("the milestone has exactly one release in the ledger", m1Releases.length === 1);
  check("released total is 200 after the concurrent pays", afterPay.escrow.releasedAmount === 200);

  check("paying a milestone that is not delivered is refused", (await pay(A, m4._id, 50)) === null);
  check("pay M2 (200) with 300 held succeeds", (await pay(A, m2._id, 200)) !== null);
  check("pay M3 (100) with 100 held succeeds", (await pay(A, m3._id, 100)) !== null);
  await M.updateOne({ _id: A, "milestones._id": m4._id }, { $set: { "milestones.$.status": "Delivered" } });
  check("paying beyond the escrow balance is refused", (await pay(A, m4._id, 50)) === null);

  // B: a double refund applies once.
  const B = await insert({
    status: "Cancelled",
    totalAmount: 500,
    escrow: { fundedAmount: 300, releasedAmount: 100, refundedAmount: 0, ledger: [] },
  });
  const [r1, r2] = await Promise.all([refund(B), refund(B)]);
  check("two concurrent refunds: exactly one applies", [r1, r2].filter(Boolean).length === 1);
  const afterRefund: any = await M.findById(B).lean();
  check("refunded total is the 200 that was unreleased", afterRefund.escrow.refundedAmount === 200);
  check("exactly one refund in the ledger", afterRefund.escrow.ledger.filter((e: any) => e.type === "refund").length === 1);

  // C: an active engagement cannot be refunded, even by a direct write.
  const C = await insert({ status: "Active", totalAmount: 500, escrow: { fundedAmount: 300, releasedAmount: 0, refundedAmount: 0, ledger: [] } });
  const direct = await M.findOneAndUpdate(
    { _id: C, status: { $in: ["Completed", "Cancelled"] } },
    { $set: { "escrow.refundedAmount": 300 } },
    { new: true }
  );
  check("refund write is refused while the engagement is active", direct === null);

  // D: cents do not drift. 0.1 + 0.2 must fit a 0.3 contract.
  const D = await insert({ totalAmount: 0.3 });
  check("funding 0.1 then 0.2 into a 0.3 contract succeeds", (await fund(D, 0.1, "D1")) !== null && (await fund(D, 0.2, "D2")) !== null);
  check("a further cent beyond 0.3 is refused", (await fund(D, 0.01, "D3")) === null);

  // E: an engagement created before escrow existed has no escrow key at all.
  const legacyId = new ObjectId();
  const legacyMilestone = milestone("Old", 10, "Delivered");
  await M.collection.insertOne({
    _id: legacyId,
    problemId: new ObjectId(),
    startupId: new ObjectId(),
    studentId: new ObjectId(),
    title: "legacy",
    currency: "INR",
    status: "Active",
    totalAmount: 500,
    milestones: [legacyMilestone],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  check("pay against a legacy record with no escrow is refused", (await pay(legacyId, legacyMilestone._id, 10)) === null);
  check("funding a legacy record initialises escrow", (await fund(legacyId, 100, "E1")) !== null);
} catch (error: any) {
  failures += 1;
  console.log(`FAIL  unexpected error: ${error?.message ?? error}`);
} finally {
  await M.db.db.dropDatabase();
  await M.db.close();
}

console.log(failures === 0 ? "\nAll escrow checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
