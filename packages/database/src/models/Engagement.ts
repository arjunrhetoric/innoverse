import mongoose from "mongoose";

const MilestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["Pending", "Delivered", "Paid", "Confirmed"],
      default: "Pending",
    },
    evidenceUrl: { type: String, default: null },
    deliveredAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    paidReference: { type: String, default: null },
    confirmedAt: { type: Date, default: null },
  },
  { _id: true }
);

const EscrowLedgerSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["fund", "release", "refund"], required: true },
    amount: { type: Number, required: true, min: 0 },
    reference: { type: String, default: null, maxlength: 120 },
    milestoneId: { type: String, default: null },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const EngagementSchema = new mongoose.Schema(
  {
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: "", maxlength: 3000 },
    currency: { type: String, default: "INR", maxlength: 8 },
    totalAmount: { type: Number, required: true, min: 1 },
    milestones: { type: [MilestoneSchema], default: [] },
    status: {
      type: String,
      enum: ["Draft", "Active", "Completed", "Cancelled"],
      default: "Draft",
      index: true,
    },
    ipAssignmentAccepted: { type: Boolean, default: false },
    studentAcceptedAt: { type: Date, default: null },
    studentAcceptedName: { type: String, default: null },
    contractCode: { type: String, unique: true, sparse: true },
    contractFile: { type: String, default: null },
    // Ledger-based escrow: what the startup has funded, what milestones
    // released, and what was returned. See apps/web/src/lib/escrow.ts.
    escrow: {
      fundedAmount: { type: Number, default: 0, min: 0 },
      releasedAmount: { type: Number, default: 0, min: 0 },
      refundedAmount: { type: Number, default: 0, min: 0 },
      ledger: { type: [EscrowLedgerSchema], default: [] },
    },
  },
  { timestamps: true }
);

EngagementSchema.index({ startupId: 1, createdAt: -1 });
EngagementSchema.index({ studentId: 1, createdAt: -1 });

export default mongoose.models.Engagement ||
  mongoose.model("Engagement", EngagementSchema);
