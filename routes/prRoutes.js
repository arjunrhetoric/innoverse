import express from "express";
import axios from "axios";
import { ensureAuth } from "../middlewares/authMiddleware.js";
import { 
  getPullRequestDetails,
  getPRComments,
  getPRCommits,
  getPRFilesChanged,
  postPRComment,
  mergePullRequest,
  closePullRequest,  
} from "../controllers/prController.js"; // Assume these exist

import { postInlineComment } from "../controllers/prInlineCommentController.js";
import { getPullRequestTimeline } from "../controllers/prTimelineController.js";
import { getPRAnalytics } from "../controllers/prAnalyticsController.js";
import {assignReviewers,listPRReviews} from "../controllers/prReviewsController.js"
import {reopenPullRequest} from "../controllers/prReopenController.js"
import {updatePullRequest} from "../controllers/prUpdateController.js"


const router = express.Router();

router.get("/details", ensureAuth, getPullRequestDetails);
router.get("/comments", ensureAuth, getPRComments);
router.get("/commits", ensureAuth, getPRCommits);
router.get("/files", ensureAuth, getPRFilesChanged);
router.post("/comment", ensureAuth, postPRComment);
router.patch("/update", ensureAuth, updatePullRequest);
router.post("/merge", ensureAuth, mergePullRequest);
router.patch("/close", ensureAuth, closePullRequest);
router.patch("/reopen", ensureAuth, reopenPullRequest);
router.post("/assign-reviewers", ensureAuth, assignReviewers);
router.get("/reviews", ensureAuth, listPRReviews);

router.get("/diff", ensureAuth, async (req, res) => {
  try {
    const { repoOwner, repoName, pullNumber } = req.query;
    if (!repoOwner || !repoName || !pullNumber) {
      return res.status(400).json({ message: "Missing required query parameters: repoOwner, repoName, pullNumber" });
    }
    const accessToken = req.user.accessToken;
    const diffResponse = await axios.get(
      `https://api.github.com/repos/${repoOwner}/${encodeURIComponent(repoName)}/pulls/${pullNumber}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3.diff"
        }
      }
    );
    res.type("text/plain").send(diffResponse.data);
  } catch (error) {
    console.error("Error fetching diff:", error.response?.data || error.message);
    res.status(500).json({ message: "Error fetching diff", error: error.response?.data || error.message });
  }
});

router.post("/inline-comment", ensureAuth, postInlineComment);
router.get("/timeline", ensureAuth, getPullRequestTimeline);
router.get("/analytics", ensureAuth, getPRAnalytics);

export default router;
