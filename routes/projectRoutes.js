import express from "express";
import { postProblem, getProblems, deleteProblem } from "../controllers/projectController.js";
import { ensureAuth, ensureStartupRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Route to fetch all problems
router.get("/all", ensureAuth, getProblems);

// Route to post a problem (with GitHub repo creation option)
router.post("/post-problem", ensureAuth, ensureStartupRole, postProblem);

router.delete("/:problemId", ensureAuth, ensureStartupRole, deleteProblem);


export default router;
