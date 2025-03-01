import mongoose from "mongoose";

const ProblemSchema = new mongoose.Schema({
  title : {
    type : String,
    required : true,
  },
  description : {
    type: String,
    required: true,
  },
  skillsRequired : {
    type : [String],
    default: [] 
  },
  createdBy : {
    type: mongoose.Schema.Types.ObjectId,
    ref : "User",
    required: true,
  },  
  finalDeadline : {
    type : Date,
    required : true,
  },
  createdAt : {
    type: Date,
    default: Date.now,
  },
  githubRepoUrl: { 
    type: String,         
     
  },
  githubRepoName:{
    type: String, 
    
  },
  githubOwner: { 
    type: String,
     
  },
  progress: { type: Number, default: 0 }
});

export default mongoose.model("Problem", ProblemSchema);
