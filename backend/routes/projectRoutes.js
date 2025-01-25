import express from "express";
import {postProblem} from "../controllers/projectController.js";
import { ensureAuth, ensureStartupRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

//Route to  post a problem
router.post("/post-problem", ensureAuth, ensureStartupRole, postProblem);

export default router;