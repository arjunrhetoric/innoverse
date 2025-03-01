// controllers/githubController.js
import axios from "axios";

export const updateReadme = async (req, res) => {
  try {
    const { repoOwner, repoName, commitMessage, readmeContent } = req.body;
    if (!repoOwner || !repoName || !commitMessage || !readmeContent) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const accessToken = req.user.accessToken;
    if (!accessToken) {
      return res.status(401).json({ message: "GitHub access token missing. Please re-login." });
    }

    const contentEncoded = Buffer.from(readmeContent).toString("base64");

    let sha;
    try {
      const getResponse = await axios.get(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/README.md`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json"
          }
        }
      );
      sha = getResponse.data.sha;
    } catch (err) {
      sha = undefined;
    }

    const payload = {
      message: commitMessage,
      content: contentEncoded
    };
    if (sha) {
      payload.sha = sha;
    }

    const response = await axios.put(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contents/README.md`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json"
        }
      }
    );

    res.json({ message: "README.md updated successfully", data: response.data });
  } catch (error) {
    console.error("Error updating README.md:", error.response?.data || error.message);
    res.status(500).json({
      message: "Error updating README.md",
      error: error.response?.data || error.message
    });
  }
};
