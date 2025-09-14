import express from "express";
import Proposal from "../models/Proposal.js";
import Milestone from "../models/Milestone.js";

const router = express.Router();

// Define the 5 software development phases
const phases = ["Planning" || "Plan"|| "Planning Phase" || "Plan Phase" , "Design" || "Designing" || "Design Phase" || "Designing Phase", "Development" || "Develop" || "Devloping Phase" || "Coding phase" || "Code" || "Development Phase" , "Testing" || "Test" || "Test Phase" || "Testing Phase", "Deployment" || "Deploy" || "Deploying" || "Deploy Phase" || "Deployment Phase"];

router.get("/progress", async (req, res) => {
  try {
    // Find an approved proposal for the current student
    const proposal = await Proposal.findOne({ studentId: req.user._id, status: "Approved" }).populate("problemId");
    let repoOwner = "";
    let repoName = "";
    if (proposal && proposal.problemId) {
      repoOwner = proposal.problemId.githubOwner || proposal.problemId.repoOwner || "";
      repoName = proposal.problemId.githubRepoName || proposal.problemId.repoName || "";
    }
    // Fallback for testing if missing
    if (!repoOwner || !repoName) {
      repoOwner = "arjundsingh";
      repoName = "repository-tracker";
    }
    
    // Fetch all milestones for this repository
    const milestones = await Milestone.find({ repoOwner, repoName });
    let completedPhases = 0;
    phases.forEach(phase => {
      // Check if a milestone with this phase title (case-insensitive) is completed
      if (milestones.find(m => m.title.toLowerCase() === phase.toLowerCase() && m.completed)) {
        completedPhases++;
      }
    });
    const progress = Math.round((completedPhases / phases.length) * 100);
    res.json({ progress, repoOwner, repoName });
  } catch (error) {
    res.status(500).json({ message: "Error fetching project progress", error: error.message });
  }
});



export default router;
