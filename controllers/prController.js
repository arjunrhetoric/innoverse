// controllers/prController.js
import axios from "axios";
import Problem from "../models/Problem.js";

// A: Get detailed pull request information
export const getPullRequestDetails = async (req, res) => {
  const { repoOwner, repoName, pullNumber } = req.query;
  const accessToken = req.user.accessToken;
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${repoOwner}/${encodeURIComponent(repoName)}/pulls/${pullNumber}`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" } }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching PR details:", error.response?.data || error.message);
    res.status(500).json({
      message: "Error fetching PR details",
      error: error.response?.data || error.message,
    });
  }
};

// B: Get PR conversation (comments)
export const getPRComments = async (req, res) => {
  const { repoOwner, repoName, pullNumber } = req.query;
  const accessToken = req.user.accessToken;
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${repoOwner}/${encodeURIComponent(repoName)}/issues/${pullNumber}/comments`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" } }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching PR comments:", error.response?.data || error.message);
    res.status(500).json({
      message: "Error fetching PR comments",
      error: error.response?.data || error.message,
    });
  }
};

// C: Get PR commits
export const getPRCommits = async (req, res) => {
  const { repoOwner, repoName, pullNumber } = req.query;
  const accessToken = req.user.accessToken;
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${repoOwner}/${encodeURIComponent(repoName)}/pulls/${pullNumber}/commits`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" } }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching PR commits:", error.response?.data || error.message);
    res.status(500).json({
      message: "Error fetching PR commits",
      error: error.response?.data || error.message,
    });
  }
};

// D: Get files changed in the PR
export const getPRFilesChanged = async (req, res) => {
  const { repoOwner, repoName, pullNumber } = req.query;
  const accessToken = req.user.accessToken;
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${repoOwner}/${encodeURIComponent(repoName)}/pulls/${pullNumber}/files`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" } }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching files changed:", error.response?.data || error.message);
    res.status(500).json({
      message: "Error fetching files changed",
      error: error.response?.data || error.message,
    });
  }
};

// E: Post a new comment on a PR
export const postPRComment = async (req, res) => {
  const { repoOwner, repoName, pullNumber, comment } = req.body;
  const accessToken = req.user.accessToken;
  if (!repoOwner || !repoName || !pullNumber || !comment) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const response = await axios.post(
      `https://api.github.com/repos/${repoOwner}/${encodeURIComponent(repoName)}/issues/${pullNumber}/comments`,
      { body: comment },
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" } }
    );
    res.json({ message: "Comment posted successfully", comment: response.data });
  } catch (error) {
    console.error("Error posting comment:", error.response?.data || error.message);
    res.status(500).json({
      message: "Error posting comment",
      error: error.response?.data || error.message,
    });
  }
};

// F: Merge a pull request and update local progress (if needed)
export const mergePullRequest = async (req, res) => {
  const { repoOwner, repoName, pullNumber } = req.body;
  const accessToken = req.user.accessToken;
  if (!repoOwner || !repoName || !pullNumber) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const mergeResponse = await axios.put(
      `https://api.github.com/repos/${repoOwner}/${encodeURIComponent(repoName)}/pulls/${pullNumber}/merge`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" } }
    );
    // Optionally, update the corresponding project in our DB
    const project = await Problem.findOne({ githubRepoName: repoName, createdBy: req.user._id });
    if (project) {
      // For instance, add 20% progress per merged PR
      project.progress = Math.min((project.progress || 0) + 20, 100);
      await project.save();
    }
    res.json({ message: "Pull Request merged successfully", data: mergeResponse.data });
  } catch (error) {
    console.error("Error merging PR:", error.response?.data || error.message);
    res.status(500).json({
      message: "Error merging PR",
      error: error.response?.data || error.message,
    });
  }
};

// G: Close a pull request (if needed)
export const closePullRequest = async (req, res) => {
  const { repoOwner, repoName, pullNumber } = req.body;
  const accessToken = req.user.accessToken;
  if (!repoOwner || !repoName || !pullNumber) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const response = await axios.patch(
      `https://api.github.com/repos/${repoOwner}/${encodeURIComponent(repoName)}/pulls/${pullNumber}`,
      { state: "closed" },
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" } }
    );
    res.json({ message: "Pull Request closed successfully", data: response.data });
  } catch (error) {
    console.error("Error closing PR:", error.response?.data || error.message);
    res.status(500).json({
      message: "Error closing PR",
      error: error.response?.data || error.message,
    });
  }
};
