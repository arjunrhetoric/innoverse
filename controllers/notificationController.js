import Notification from "../models/Notification.js";

export const createNotification = async (req, res) => {
  try {
    const { message, userId } = req.body; // Adjust if needed
    const notification = new Notification({ message, userId });
    await notification.save();
    // Optionally emit a socket event:
    req.io.emit("newNotification", { message: notification.message, createdAt: notification.createdAt });
    res.json({ message: "Notification created", data: notification });
  } catch (error) {
    res.status(500).json({ message: "Error creating notification", error: error.message });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Error fetching notifications", error: error.message });
  }
};
