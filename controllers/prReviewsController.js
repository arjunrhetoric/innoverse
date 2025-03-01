// controllers/prReviewerController.js
import axios from "axios";

export const assignReviewers = async (req, res) => {
  const { repoOwner, repoName, pullNumber, reviewers } = req.body;
  const accessToken = req.user.accessToken;
  if (!repoOwner || !repoName || !pullNumber || !reviewers || !Array.isArray(reviewers)) {
    return res.status(400).json({ message: "Missing or invalid required fields" });
  }
  try {
    const response = await axios.post(
      `https://api.github.com/repos/${repoOwner}/${encodeURIComponent(repoName)}/pulls/${pullNumber}/requested_reviewers`,
      { reviewers },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );
    res.json({ message: "Reviewers assigned successfully", data: response.data });
  } catch (error) {
    console.error("Error assigning reviewers:", error.response?.data || error.message);
    res.status(500).json({
      message: "Error assigning reviewers",
      error: error.response?.data || error.message,
    });
  }
};


export const listPRReviews = async (req, res) => {
  const { repoOwner, repoName, pullNumber } = req.query;
  const accessToken = req.user.accessToken;
  if (!repoOwner || !repoName || !pullNumber) {
    return res.status(400).json({ message: "Missing required query parameters" });
  }
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${repoOwner}/${encodeURIComponent(repoName)}/pulls/${pullNumber}/reviews`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching PR reviews:", error.response?.data || error.message);
    res.status(500).json({
      message: "Error fetching PR reviews",
      error: error.response?.data || error.message,
    });
  }
};

