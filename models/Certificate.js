import mongoose from "mongoose";

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
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export default mongoose.model("Certificate", CertificateSchema);