// controllers/prInlineCommentController.js
import InlineComment from "../models/InlineComment.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

export const postInlineComment = async (req, res) => {
  try {
    const { repoOwner, repoName, pullNumber, lineNumber, comment } = req.body;
    if (!repoOwner || !repoName || !pullNumber || lineNumber === undefined || !comment) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newComment = new InlineComment({
      repoOwner,
      repoName,
      pullNumber,
      lineNumber,
      comment,
      createdBy: req.user._id
    });
    await newComment.save();

    // For display in conversation, let's store the user's name
    // (or you can do a populate in the fetch route)
    const userName = req.user.name || req.user.githubUsername || "Unknown";

  

    res.json({ message: "Inline comment saved successfully", data: newComment });
  } catch (error) {
    console.error("Error saving inline comment:", error);
    res.status(500).json({ message: "Error saving inline comment", error: error.message });
  }
};

// Add a GET route to fetch all inline comments for a PR
export const getInlineComments = async (req, res) => {
  try {
    const { repoOwner, repoName, pullNumber } = req.query;
    const comments = await InlineComment.find({
      repoOwner,
      repoName,
      pullNumber
    })
      .populate("createdBy", "name githubUsername")
      .sort({ createdAt: 1 });
    
    // Return them in a consistent shape
    const result = comments.map(c => ({
      _id: c._id,
      comment: c.comment,
      createdAt: c.createdAt,
      createdByName: c.createdBy?.name || c.createdBy?.githubUsername || "Unknown"
    }));
    res.json(result);
  } catch (err) {
    console.error("Error fetching inline comments:", err);
    res.status(500).json({ message: "Error fetching inline comments", error: err.message });
  }
};
