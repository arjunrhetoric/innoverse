import Milestone from "../models/Milestone.js";
import Problem from "../models/Problem.js";

export const getMilestones = async (req, res) => {
  try {
    const { repoOwner, repoName } = req.query;
    if (!repoOwner || !repoName) {
      return res.status(400).json({ message: "Missing required query parameters" });
    } 
    const milestones = await Milestone.find({ repoOwner, repoName }).sort({ deadline: 1 });
    res.json(milestones);
  } catch (error) {
    console.error("Error fetching milestones:", error);
    res.status(500).json({ message: "Error fetching milestones", error: error.message });
  }
};

export const createMilestone = async (req, res) => {
  try {
    const { repoOwner, repoName, title, description, deadline } = req.body;

     // Add validation for existing milestones
     const existing = await Milestone.findOne({ repoOwner, repoName, title });
     if(existing) {
       return res.status(400).json({ message: "Milestone with this title already exists" });
     }


    if (!repoOwner || !repoName || !title) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const milestone = new Milestone({ repoOwner, repoName, title, description, deadline });
    await milestone.save();
    // Emit milestone update event via Socket.IO
    if (req.io) {
      req.io.emit("milestoneUpdate", { repoOwner, repoName, milestone });
    }
    res.json({ message: "Milestone created successfully", data: milestone });
  } catch (error) {
    console.error("Error creating milestone:", error);
    res.status(500).json({ message: "Error creating milestone", error: error.message });
  }
};

export const updateMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, deadline } = req.body;
    const milestone = await Milestone.findByIdAndUpdate(
      id,
      { title, description, deadline },
      { new: true }
    );
    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }
    // Emit update event
    if (req.io) {
      req.io.emit("milestoneUpdate", { repoOwner: milestone.repoOwner, repoName: milestone.repoName, milestone });
    }
    res.json({ message: "Milestone updated successfully", data: milestone });
  } catch (error) {
    console.error("Error updating milestone:", error);
    res.status(500).json({ message: "Error updating milestone", error: error.message });
  }
};

export const deleteMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    // Find the milestone before deleting so we can emit its info
    const milestone = await Milestone.findById(id);
    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }
    await Milestone.findByIdAndDelete(id);
    // Emit update event indicating deletion (if needed, you could pass a flag)
    if (req.io) {
      req.io.emit("milestoneUpdate", { repoOwner: milestone.repoOwner, repoName: milestone.repoName, milestone: null });
    }
    res.json({ message: "Milestone deleted successfully" });
  } catch (error) {
    console.error("Error deleting milestone:", error);
    res.status(500).json({ message: "Error deleting milestone", error: error.message });
  }
};

export const markMilestoneComplete = async (req, res) => {
  try {
    const { id } = req.params;
    const milestone = await Milestone.findByIdAndUpdate(
      id,
      { completed: true, completedAt: new Date() },
      { new: true }
    );
    if (!milestone) {
      return res.status(404).json({ message: "Milestone not found" });
    }

    const allMilestones = await Milestone.find({ 
      repoOwner: milestone.repoOwner,
      repoName: milestone.repoName
    });
    
    const completedCount = allMilestones.filter(m => m.completed).length;
    const progress = (completedCount / allMilestones.length) * 100;

    // Update project progress (assuming you have a Project model)
    await Problem.findOneAndUpdate(
      { repoOwner: milestone.repoOwner, repoName: milestone.repoName },
      { progress },
      { new: true }
    );

    // Emit updated progress
    req.io.emit("milestoneUpdate", { 
      repoOwner: milestone.repoOwner,
      repoName: milestone.repoName,
      progress 
    });
    res.json({ message: "Milestone marked as complete", data: milestone });
  } catch (error) {
    console.error("Error marking milestone complete:", error);
    res.status(500).json({ message: "Error marking milestone complete", error: error.message });
  }
};
