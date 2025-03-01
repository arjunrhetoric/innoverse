// routes/projectTrackingRoutes.js
import express from 'express';
import axios from 'axios';
import Proposal from "../models/Proposal.js";
import Problem from '../models/Problem.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    if (req.user.role === "Startup") {
      const { githubUsername, accessToken, githubRepoName } = req.user;
      if (!githubRepoName) {
        return res.status(400).send("GitHub repository name not set for startup.");
      }
      const encodedRepoName = encodeURIComponent(githubRepoName);
      const prResponse = await axios.get(`https://api.github.com/repos/${githubUsername}/${encodedRepoName}/pulls`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json'
          }
        }
      );
      const pullRequests = prResponse.data;
      return res.render('project-tracking-dashboard', { 
        user: req.user,
        role: req.user.role, 
        pullRequests, 
        progress: null, 
        milestones: [] 
      });
    }
    // For Student users
    const progress = await getStudentProjectProgress(req.user._id);
    const milestones = await getStudentMilestones(req.user._id);
    res.render('project-tracking-dashboard', { 
      user: req.user,
      role: req.user.role, 
      pullRequests: null, 
      progress, 
      milestones 
    });
  } catch (error) {
    console.error("Project Tracking Dashboard error:", error.message);
    res.status(500).send("Server Error");
  }
});

async function getStudentProjectProgress(studentId) {
  const proposal = await Proposal.findOne({ studentId, status: "Approved" }).populate("problemId");
  return proposal && proposal.problemId ? proposal.problemId.progress || 0 : 0;
}

async function getStudentMilestones(studentId) {
  return [
    { title: "Planning", description: "Planning phase completed", completed: true },
    { title: "Design", description: "Design phase in progress", completed: false },
    { title: "Development", description: "Development phase pending", completed: false }
  ];
}

export default router;
