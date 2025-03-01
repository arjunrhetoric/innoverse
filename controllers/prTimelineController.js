import axios from "axios";
import InlineComment from "../models/InlineComment.js";

export const getPullRequestTimeline = async (req, res) => {
  try {
    const { repoOwner, repoName, pullNumber } = req.query;
    if (!repoOwner || !repoName || !pullNumber) {
      return res.status(400).json({ message: "Missing required query parameters" });
    }
    const accessToken = req.user.accessToken;
    // Fetch GitHub events for the PR (using the preview header)
    const ghTimeline = await axios.get(
      `https://api.github.com/repos/${repoOwner}/${encodeURIComponent(repoName)}/issues/${pullNumber}/events`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.mockingbird-preview+json"
        }
      }
    );
    // Fetch inline comment events from our DB for this PR
    const inlineComments = await InlineComment.find({
      repoOwner,
      repoName,
      pullNumber
    }).populate("createdBy", "name");
    // Merge and sort by createdAt (most recent first)
    const mergedTimeline = [
      ...ghTimeline.data.map(e => ({
        source: "GitHub",
        event: e.event,
        actor: e.actor,
        created_at: e.created_at,
        description: e.commit_id ? `Commit ${e.commit_id}` : ""
      })),
      ...inlineComments.map(c => ({
        source: "Inline Comment",
        event: "commented",
        actor: { login: c.createdBy.name },
        created_at: c.createdAt,
        description: c.comment
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(mergedTimeline);
  } catch (error) {
    console.error("Error fetching timeline:", error.response?.data || error.message);
    res.status(500).json({ message: "Error fetching timeline", error: error.response?.data || error.message });
  }
};
