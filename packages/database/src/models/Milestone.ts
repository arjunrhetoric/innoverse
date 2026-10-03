// models/Milestone.js
import mongoose from "mongoose";

const MilestoneSchema = new mongoose.Schema(
  {
    problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem" },
    repoOwner: { type: String },
    repoName: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    deadline: { type: Date },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.models.Milestone || mongoose.model("Milestone", MilestoneSchema);
