import mongoose from "mongoose";
import crypto from "crypto";

const CertificateSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  startupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  review: {
    type: String,
    required: true
  },
  certificateFile: {
    type: String,
    required: true
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  verificationCode: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(16).toString('hex') // Add default value
  },
  evidence: {
    mergedPRs: { type: Number, default: 0 },
    commits: { type: Number, default: 0 },
    milestonesCompleted: { type: Number, default: 0 },
    milestonesTotal: { type: Number, default: 0 },
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export default mongoose.models.Certificate || mongoose.model("Certificate", CertificateSchema);
