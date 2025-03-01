// controllers/prReopenController.js
import axios from "axios";

export const reopenPullRequest = async (req, res) => {
  const { repoOwner, repoName, pullNumber } = req.body;
  const accessToken = req.user.accessToken;
  if (!repoOwner || !repoName || !pullNumber) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const response = await axios.patch(
      `https://api.github.com/repos/${repoOwner}/${encodeURIComponent(repoName)}/pulls/${pullNumber}`,
      { state: "open" },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );
    res.json({ message: "Pull Request reopened successfully", data: response.data });
  } catch (error) {
    console.error("Error reopening PR:", error.response?.data || error.message);
    res.status(500).json({
      message: "Error reopening PR",
      error: error.response?.data || error.message,
    });
  }
};
