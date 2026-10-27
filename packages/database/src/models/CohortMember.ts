import mongoose from "mongoose";

const CohortMemberSchema = new mongoose.Schema(
  {
    cohortId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cohort",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

CohortMemberSchema.index({ cohortId: 1, studentId: 1 }, { unique: true });

export default mongoose.models.CohortMember ||
  mongoose.model("CohortMember", CohortMemberSchema);
