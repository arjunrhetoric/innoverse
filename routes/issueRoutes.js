// routes/issueRoutes.js
import express from "express";
import { createIssue, updateIssue } from "../controllers/issueController.js";
import { ensureAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create", ensureAuth, createIssue);
router.patch("/update", ensureAuth, updateIssue);

export default router;
