import InlineComment from "../models/InlineComment.js";
import axios from "axios";

export const getPRAnalytics = async (req, res) => {
  try {
    const { repoOwner, repoName, pullNumber } = req.query;
    if (!repoOwner || !repoName || !pullNumber) {
      return res.status(400).json({ message: "Missing required parameters" });
    }
    const accessToken = req.user.accessToken;
    
    // Example: Count inline comments from our DB
    const inlineCount = await InlineComment.countDocuments({
      repoOwner,
      repoName,
      pullNumber
    });
    
    // Example: Fetch number of comments from GitHub
    const commentsResponse = await axios.get(
      `https://api.github.com/repos/${repoOwner}/${encodeURIComponent(repoName)}/issues/${pullNumber}/comments`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" } }
    );
    const ghCommentsCount = commentsResponse.data.length;
    
    // For review time, you might need to store review events in your DB. Here we simulate:
    const averageReviewTime = "N/A"; // Placeholder for actual computation
    
    res.json({
      inlineComments: inlineCount,
      githubComments: ghCommentsCount,
      averageReviewTime
    });
  } catch (error) {
    console.error("Error computing analytics:", error.response?.data || error.message);
    res.status(500).json({ message: "Error computing analytics", error: error.response?.data || error.message });
  }
};
