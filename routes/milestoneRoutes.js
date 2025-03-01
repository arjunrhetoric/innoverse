import express from "express";
import { ensureAuth } from "../middlewares/authMiddleware.js";
import { 
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  markMilestoneComplete
} from "../controllers/milestoneController.js";

const router = express.Router();

router.get("/", ensureAuth, getMilestones);
router.get("/:id", ensureAuth, async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) return res.status(404).json({ message: "Milestone not found" });
    res.json(milestone);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.post("/", ensureAuth, createMilestone);
router.patch("/:id", ensureAuth, updateMilestone);
router.delete("/:id", ensureAuth, deleteMilestone);
router.patch("/:id/complete", ensureAuth, markMilestoneComplete);

export default router;
