import mongoose from "mongoose";

const ProposalSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  pptUrl: {
    type: String, // URL/path for the uploaded PPT/PDF file
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  feedback: {
    type: String,
    default: "",
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Proposal", ProposalSchema);
