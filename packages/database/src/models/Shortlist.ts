import mongoose from "mongoose";

const ShortlistSchema = new mongoose.Schema(
  {
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
    note: {
      type: String,
      default: "",
      maxlength: 500,
    },
  },
  { timestamps: true }
);

ShortlistSchema.index({ startupId: 1, studentId: 1 }, { unique: true });

export default mongoose.models.Shortlist ||
  mongoose.model("Shortlist", ShortlistSchema);
