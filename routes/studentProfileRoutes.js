// routes/studentProfileRoutes.js
import express from "express";
import User from "../models/User.js";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

router.get("/:id", async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) {
      return res.status(404).send("Student not found");
    }
    const githubAccessToken = process.env.GITHUB_ACCESS_TOKEN;
    const githubId = student.githubId; 
    const response = await axios.get(`https://api.github.com/user/${githubId}`, {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    const githubProfile = response.data;
    res.render("student-github-profile", { user: student, githubProfile });
  } catch (err) {
    console.error("Error fetching student GitHub profile:", err);
    res.status(500).send("Error fetching profile");
  }
});

export default router;
