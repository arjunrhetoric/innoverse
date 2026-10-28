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
  },
  { timestamps: true }
);

EngagementSchema.index({ startupId: 1, createdAt: -1 });
EngagementSchema.index({ studentId: 1, createdAt: -1 });

export default mongoose.models.Engagement ||
  mongoose.model("Engagement", EngagementSchema);
