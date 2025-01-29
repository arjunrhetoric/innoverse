import express from "express";
import {submitProposal, getProposalForProblem, reviewProposal} from "../controllers/proposalController.js"
import { ensureAuth } from "../middlewares/authMiddleware.js";
import upload from "../config/multerConfig.js";

const router  = express.Router();

//Student submits a proposal with a file upload
router.post("/submit",upload.single("proposalFile") ,ensureAuth,submitProposal);

//Startup views proposal for a problem
router.get("/:problemId", ensureAuth, getProposalForProblem);

router.patch("/:proposalId/review", ensureAuth, reviewProposal);

export default router;

