import express from "express";
import { ensureAuth, ensureStartupRole } from "../middlewares/authMiddleware.js";
import Certificate from "../models/Certificate.js";
import upload from "../config/multerConfig.js";
import nodemailer from "nodemailer";
import Problem from "../models/Problem.js";
import Proposal from "../models/Proposal.js";
import User from "../models/User.js";
import { v4 as uuidv4 } from 'uuid';


const router = express.Router();

// Submit Certificate Route
router.post(
  "/submit",
  ensureAuth,
  ensureStartupRole,
  upload.single("certificate"),
  async (req, res) => {
    try {
      const { problemId, rating, review } = req.body;

      // Check if proposal exists for given problemId
      const proposalData = await Proposal.findOne({ problemId });
      if (!proposalData) {
        return res.status(404).json({ message: "Proposal not found for the given problemId" });
      }

      const studentId = proposalData.studentId;

      console.log("Problem ID:", problemId);
      console.log("Rating:", rating);
      console.log("Review:", review);
      console.log("Student ID:", studentId);
      console.log("Startup ID:", req.user._id);
      console.log("Uploaded File:", req.file ? req.file.filename : "No file uploaded");

      // Ensure file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: "Certificate file is required" });
      }

      // Save certificate
      const certificate = new Certificate({
        studentId,
        startupId: req.user._id,
        problemId,
        rating,
        review,
        certificateFile: `/certificates/${req.file.filename}`,
        verificationCode : uuidv4(),
      });

      await certificate.save();

      // Update student's profile
      const student = await User.findById(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      student.projectsCompleted += 1;
      student.ratings.push(rating);
      await student.save();

      // Send email to student
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      // Get problem details
      const problem = await Problem.findById(problemId);
      const problemTitle = problem ? problem.title : "Unknown Project";

      await transporter.sendMail({
        from: process.env.EMAIL,
        to: student.email,
        subject: "🎉 Project Completion Certificate Issued!",
        html: `<h2>Congratulations ${student.name}!</h2>
              <p>Your certificate for project <b>${problemTitle}</b> has been issued!</p>
              <p><b>Rating:</b> ${"⭐".repeat(rating)}</p>
              <p><b>Review:</b> ${review}</p>
              <p>Download your certificate from your profile page.</p>`,
      });

      res.json({ message: "Certificate submitted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

//  Get Student's Certificates Route
router.get("/student/:studentId", ensureAuth, async (req, res) => {
  try {
    const certificates = await Certificate.find({ studentId: req.params.studentId })
      .populate("startupId", "name")
      .populate("problemId", "title"); // Corrected from "projectId"

    if (!certificates || certificates.length === 0) {
      return res.status(404).json({ message: "No certificates found" });
    }

    res.json(certificates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;