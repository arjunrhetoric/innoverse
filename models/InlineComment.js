import mongoose from "mongoose";

const InlineCommentSchema = new mongoose.Schema({
  repoOwner: { type: String, required: true },
  repoName: { type: String, required: true },
  pullNumber: { type: Number, required: true },
  lineNumber: { type: Number, required: true },
  comment: { type: String, required: true },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "InlineComment", default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("InlineComment", InlineCommentSchema);
