import mongoose from "mongoose";

const KnowledgeEntrySchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["qa", "review"],
      required: true,
    },
    question: { type: String, default: null },
    pullNumber: { type: Number, default: null },
    answer: { type: String, required: true },
    sources: { type: [String], default: [] },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
    model: { type: String, default: null },
  },
  { timestamps: true }
);

KnowledgeEntrySchema.index({ problemId: 1, createdAt: -1 });

export default mongoose.models.KnowledgeEntry ||
  mongoose.model("KnowledgeEntry", KnowledgeEntrySchema);
