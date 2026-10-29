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
  repoUrl: {
    type: String,
    default: null,
  },
  termsAcceptedAt: {
    type: Date,
    default: null,
  },
  termsAcceptedName: {
    type: String,
    default: null,
  },
  accessGrantedAt: {
    type: Date,
    default: null,
  },
  // Last known repository-access result, so the UI never has to guess from a
  // timestamp alone. "invited" and "failed" both mean access is not active.
  accessStatus: {
    type: String,
    enum: ["owner", "collaborator", "invited", "public", "granted", "failed"],
    default: null,
  },
  accessError: {
    type: String,
    default: null,
  },
  accessCheckedAt: {
    type: Date,
    default: null,
  },
  agreementCode: {
    type: String,
    default: null,
  },
  agreementFile: {
    type: String,
    default: null,
  },
});

export default mongoose.models.Proposal || mongoose.model("Proposal", ProposalSchema);
