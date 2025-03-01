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
  businessName: {
    type: String,
  },
  githubRepoName: {
    type: String,
    default: null,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model('User', UserSchema);
