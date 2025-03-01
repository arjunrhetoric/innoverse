import express from "express";
import { submitProposal, reviewProposal } from "../controllers/proposalController.js";
import { ensureAuth } from "../middlewares/authMiddleware.js";
import upload from "../config/multerConfig.js";

const router = express.Router();

// Route to render the proposal submission page
router.get("/submit/:problemId", ensureAuth, (req, res) => {
  if (!req.params.problemId) {
    return res.status(400).send("Problem ID is required");
  }
  res.render("submit-proposal", { user: req.user, problemId: req.params.problemId });
});

// Route to submit a proposal (with file upload)
router.post("/submit", ensureAuth, upload.single("proposalFile"), submitProposal);

// Route to review a proposal (approve or request revision)
router.patch("/:proposalId/review", ensureAuth, reviewProposal);

export default router;
