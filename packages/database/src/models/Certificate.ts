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
  sha256: {
    // Fingerprint of the generated PDF (integrity).
    type: String,
    default: null,
  },
  revoked: {
    type: Boolean,
    default: false,
  },
  revokedAt: Date,
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  revocationReason: {
    type: String,
    default: null,
  },
  evidence: {
    mergedPRs: { type: Number, default: 0 },
    prsOpened: { type: Number, default: 0 },
    commits: { type: Number, default: 0 },
    commitsByStudent: { type: Number, default: 0 },
    commitsByOthers: { type: Number, default: 0 },
    activeDays: { type: Number, default: 0 },
    linesAdded: { type: Number, default: 0 },
    linesDeleted: { type: Number, default: 0 },
    reviewsGiven: { type: Number, default: 0 },
    milestonesCompleted: { type: Number, default: 0 },
    milestonesTotal: { type: Number, default: 0 },
    snapshotAt: { type: Date, default: null },
  },
  rubric: {
    rows: [
      {
        key: String,
        label: String,
        score: Number,
        weight: Number,
        weighted: Number,
      },
    ],
    overall: { type: Number, default: 0 },
  },
  confidence: {
    score: { type: Number, default: 0 },
    level: { type: String, enum: ["high", "medium", "low"], default: "low" },
    reasons: { type: [String], default: [] },
  },
  summary: {
    type: String,
    default: "",
  },
  publicToken: {
    type: String,
    unique: true,
    sparse: true,
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export default mongoose.models.Certificate || mongoose.model("Certificate", CertificateSchema);
