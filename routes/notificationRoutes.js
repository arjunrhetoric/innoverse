import express from "express";
import { ensureAuth } from "../middlewares/authMiddleware.js";
import { getNotifications, createNotification } from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", ensureAuth, getNotifications);
router.post("/", ensureAuth, createNotification);

export default router;
