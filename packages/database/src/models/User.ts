import mongoose from "mongoose";

const UserSchema  = new mongoose.Schema({ 
  githubId: {
    type: String, 
    unique: true, 
    sparse: true,
  },
  githubUsername: {
    type: String,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  accessToken: {
    type: String,
  }, 
  role: {
    type: String,
    enum: ['Student', 'Startup', null],
    default: null,
  },
  businessEmail: {
    type: String,
    default: null,
  },
  companyName: {
    type: String,
    default: null,
  },
  startupLogo: {
    type: String, // public path to uploaded company logo (png/jpg)
    default: null,
  },
  signatoryName: {
    type: String,
    default: null,
  },
  signatoryTitle: {
    type: String,
    default: null,
  },
  signatureImage: {
    type: String, // public path to uploaded signature image (png/jpg)
    default: null,
  },
  githubRepoName: {
    type: String,
    default: null,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  projectsCompleted: {
    type: Number,
    default: 0
  },
  ratings: {
    type: [Number],
    default: []
  }
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
