// models/Notification.js
import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  title: { type: String, default: null },
  message: { type: String, required: true },
  link: { type: String, default: null },
  type: { type: String, default: "info" },
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
