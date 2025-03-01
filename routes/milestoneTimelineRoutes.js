// routes/milestoneTimelineRoutes.js
import express from "express";
import Milestone from "../models/Milestone.js"; // Ensure this path is correct

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { repoOwner, repoName } = req.query;
    if (!repoOwner || !repoName) {
      return res.status(400).json({ message: "Missing required query parameters" });
    }
    // Fetch milestones for the given repository
    const milestones = await Milestone.find({ repoOwner, repoName }).sort({ updatedAt: -1 });
    
    // Map milestones to timeline events. Use m.createdAt if updatedAt is not defined.
    const timeline = milestones.map(m => ({
      event: m.completed ? "Milestone Completed" : "Milestone Created/Updated",
      milestoneTitle: m.title,
      actor: { login: "Startup" },  // Or, if available, m.createdBy
      created_at: m.updatedAt || m.createdAt,
      details: m.description
    }));
    
    res.json(timeline);
  } catch (error) {
    console.error("Error fetching timeline:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
