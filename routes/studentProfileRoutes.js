import express from "express";
import User from "../models/User.js";
import axios from "axios";
import dotenv from "dotenv";
import Certificate from "../models/Certificate.js"; // Ensure this model is imported
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


    // Fetch certificates for this student
     const certificateData = await Certificate.find({ studentId: req.params.id})
                .populate('startupId', 'name githubUsername')
                .populate('problemId', 'title');

    res.render("student-github-profile", {
      user: student,
      githubProfile,
      certificates : certificateData, // Pass certificates to EJS
    });
  } catch (err) {
    console.error("Error fetching student GitHub profile:", err);
    res.status(500).send("Error fetching profile");
  }
});

export default router;
