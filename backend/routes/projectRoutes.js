import express from "express";
import {getProblems, postProblem} from "../controllers/projectController.js";
import { ensureAuth, ensureStartupRole } from "../middlewares/authMiddleware.js";


const router = express.Router();

//Route to fetch all problems
router.get("/all", ensureAuth, getProblems);

//Route to  post a problem
router.post("/post-problem", ensureAuth, ensureStartupRole, postProblem);

export default router;