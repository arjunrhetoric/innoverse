// routes/githubRoutes.js
import express from "express";
import axios from "axios";
import { updateReadme } from "../controllers/githubController.js";
import { ensureAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Route to update the README.md in the startup's repository
router.put("/update-readme", ensureAuth, updateReadme);

router.post('/merge-pr', async (req, res) => {
    try {
      const { prNumber } = req.body;
      const { githubUsername, accessToken, githubRepoName } = req.user;
      const url = `https://api.github.com/repos/${githubUsername}/${githubRepoName}/pulls/${prNumber}/merge`;
      const response = await axios.put(
        url,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json'
          }
        }
      );
      res.json({ success: true, data: response.data });
    } catch (error) {
      console.error("Merge PR error:", error.response?.data || error.message);
      res.status(500).json({ success: false, message: error.response?.data.message || error.message });
    }
  });
      


export default router;
