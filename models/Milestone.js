// models/Milestone.js
import mongoose from "mongoose";

const MilestoneSchema = new mongoose.Schema(
  {
    repoOwner: { type: String, required: true },
    repoName: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    deadline: { type: Date },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("Milestone", MilestoneSchema);
