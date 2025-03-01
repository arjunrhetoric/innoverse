// controllers/projectController.js
import axios from "axios";
import Problem from "../models/Problem.js";
import dotenv from "dotenv";
import User from "../models/User.js";
dotenv.config();

export const postProblem = async (req, res) => {
  try {
    const { title, description, skillsRequired, finalDeadline, createGithubRepo, githubRepoName } = req.body;

    // Ensure the user is authenticated and is a startup
    if (!req.user || req.user.role !== "Startup") {
      return res.status(403).json({ message: "Unauthorized: Only startups can post challenges" });
    }

    // Validate input
    if (!title || !description || !finalDeadline) {
      return res.status(400).json({ message: "Title, description, and deadline are required!" });
    }

    if (new Date(finalDeadline) <= new Date()) {
      return res.status(400).json({ message: "Final deadline must be a future date" });
    }

    let repoUrl = null;
    let githubOwner = null;

    const githubAccessToken = req.user.accessToken;
    if (createGithubRepo && githubRepoName) {
      try {
        const githubUsername = req.user.githubUsername || req.user.name;
        const response = await axios.post(
          "https://api.github.com/user/repos",
          { name: githubRepoName, private: true },
          { headers: { Authorization: `Bearer ${githubAccessToken}` } }
        );

        repoUrl = response.data.html_url;
        githubOwner = githubUsername;

        await User.findByIdAndUpdate(req.user._id, { githubRepoName: githubRepoName });
      } catch (error) {
        console.error("GitHub Repo Creation Error:", error.response?.data || error.message);
        return res.status(500).json({ message: "Failed to create GitHub repository" });
      }
    }

    const problem = new Problem({
      title,
      description,
      skillsRequired,
      finalDeadline,
      createdBy: req.user.id,
      githubRepoName: createGithubRepo ? githubRepoName : null,
      githubRepoUrl: repoUrl,
      githubOwner: githubOwner,
      createdBy: req.user._id
    });

    await problem.save();
    res.status(201).json({ message: "Problem Statement posted successfully", problem });
  } catch (error) {
    res.status(500).json({ message: "Error posting problem statement", error: error.message });
  }
};

export const getProblems = async (req, res) => {
  try {
    const problems = await Problem.find().populate("createdBy", "name email");
    res.status(200).json({ message: "Problems fetched successfully", problems });
  } catch (error) {
    res.status(500).json({ message: "Error fetching problems", error: error.message });
  }
};

export const deleteProblem = async (req, res) => {
  try {
    const { problemId } = req.params;
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }
    if (problem.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this problem" });
    }
    await Problem.findByIdAndDelete(problemId);
    res.status(200).json({ message: "Problem deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
