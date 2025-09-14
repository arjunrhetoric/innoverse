import mongoose from "mongoose";
import bcrypt from "bcrypt";

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
    enum: ['Student', 'Startup'],
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

export default mongoose.model('User', UserSchema);
