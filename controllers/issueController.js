// controllers/issueController.js
import axios from "axios";

// Create a new issue (task)
export const createIssue = async (req, res) => {
  const { repoOwner, repoName, title, body, labels } = req.body;
  const accessToken = req.user.accessToken;
  if (!repoOwner || !repoName || !title) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const response = await axios.post(
      `https://api.github.com/repos/${repoOwner}/${encodeURIComponent(repoName)}/issues`,
      { title, body, labels },
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" } }
    );
    res.json({ message: "Issue created successfully", issue: response.data });
  } catch (error) {
    console.error("Error creating issue:", error.response?.data || error.message);
    res.status(500).json({ message: "Error creating issue", error: error.response?.data || error.message });
  }
};

// Update an issue (e.g., add a comment or change state)
export const updateIssue = async (req, res) => {
  const { repoOwner, repoName, issueNumber, title, body, state } = req.body;
  const accessToken = req.user.accessToken;
  if (!repoOwner || !repoName || !issueNumber) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const response = await axios.patch(
      `https://api.github.com/repos/${repoOwner}/${encodeURIComponent(repoName)}/issues/${issueNumber}`,
      { title, body, state },
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" } }
    );
    res.json({ message: "Issue updated successfully", issue: response.data });
  } catch (error) {
    console.error("Error updating issue:", error.response?.data || error.message);
    res.status(500).json({ message: "Error updating issue", error: error.response?.data || error.message });
  }
};
