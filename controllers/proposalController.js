// controllers/proposalController.js
import fs from "fs";
import path from "path";
import Proposal from "../models/Proposal.js";
import Problem from "../models/Problem.js";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import axios from "axios";
import User from "../models/User.js";

// Add transporter configuration (add to top of file)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const submitProposal = async (req, res) => {
  try {
    const { problemId, description } = req.body;
    const studentId = req.user._id;
    const startupId = req.user.role === "Startup" ? req.user._id : null; // Define startupId based on user role

    // Check if a pending proposal already exists for this problem by the student
    const existingProposal = await Proposal.findOne({ 
      studentId, 
      problemId, 
      status: "Pending" 
    });

    if (existingProposal) {
      return res.status(400).json({
        message: "You have already submitted a proposal for this problem. Please wait for review before reapplying."
      });
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Proposal file is required" });
    }

    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, req.file.buffer);

    const proposal = new Proposal({
      studentId,
      startupId, // Include startupId if applicable
      problemId,
      description,
      pptUrl: `/uploads/${fileName}`,
      status: "Pending",
      feedback: ""
    });

    await proposal.save();
    res.status(201).json({ message: "Proposal submitted successfully", proposal });
  } catch (error) {
    console.error("Proposal Submission Error:", error);
    res.status(500).json({ message: "Error submitting proposal", error: error.message });
  }
};

export const reviewProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { status, feedback } = req.body;

    const proposal = await Proposal.findById(proposalId)
      .populate('studentId')
      .populate('problemId');

    if (!proposal) return res.status(404).json({ message: "Proposal not found" });

    proposal.status = status;
    proposal.feedback = feedback || "";
    await proposal.save();

    // If approved, add collaborator and send email
    if (status === "Approved") {
      const problem = await Problem.findById(proposal.problemId);
      const student = await User.findById(proposal.studentId);

      // Add student as collaborator
      const addCollabResponse = await axios.put(
        `https://api.github.com/repos/${problem.githubOwner}/${problem.githubRepoName}/collaborators/${student.githubUsername}`,
        { permission: "push" },
        {
          headers: {
            Authorization: `Bearer ${req.user.accessToken}`,
            Accept: "application/vnd.github+json"
          }
        }
      );

      // Update proposal with repo URL
      proposal.repoUrl = `https://github.com/${problem.githubOwner}/${problem.githubRepoName}`;
      await proposal.save();

      // Send email
      const mailOptions = {
        from: process.env.EMAIL,
        to: student.email,
        subject: '🎉 Proposal Approved! Collaboration Started',
        html: `<h2>Congratulations ${student.name}!</h2>
              <p>Your proposal for "${problem.title}" has been approved!</p>
              <p>Repository URL: <a href="${proposal.repoUrl}">${proposal.repoUrl}</a></p>
              <p>Start collaborating now!</p>`
      };

      await transporter.sendMail(mailOptions);
    }

    res.json({ message: "Proposal reviewed successfully", proposal });
  } catch (error) {
    console.error("Review Proposal Error:", error);
    res.status(500).json({ message: "Error reviewing proposal", error: error.message });
  }
};