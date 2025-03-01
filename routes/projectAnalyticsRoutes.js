import express from "express";
import Milestone from "../models/Milestone.js";
const router = express.Router();

router.get("/analytics", async (req, res) => {
  try {
    // For the student side, filter by project (repoOwner and repoName provided as query parameters)
    const { repoOwner, repoName } = req.query;
    if (!repoOwner || !repoName) {
      return res.status(400).json({ message: "Missing required query parameters" });
    }
    const milestones = await Milestone.find({ repoOwner, repoName });
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.completed).length;
    const pendingMilestones = totalMilestones - completedMilestones;
    let totalTime = 0;
    milestones.filter(m => m.completed && m.completedAt).forEach(m => {
      totalTime += (m.completedAt - m.createdAt);
    });
    const avgCompletionTime = milestones.filter(m => m.completed && m.completedAt).length ? (totalTime / milestones.filter(m => m.completed && m.completedAt).length) / (1000 * 60 * 60) : 0;
    res.json({ 
      completedMilestones, 
      pendingMilestones, 
      avgCompletionTime: avgCompletionTime.toFixed(2) + " hours"
    });
  } catch (error) {
    res.status(500).json({ message: "Error computing analytics", error: error.message });
  }
});

export default router;
