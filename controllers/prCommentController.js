// Within your post comment controller function
import Notification from "../models/Notification.js";
import User from "../models/User.js";

function extractMentions(text) {
  // This regex finds words starting with @ (you may want to adjust to your username rules)
  const mentionRegex = /@([\w.-]+)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}

export const postPRComment = async (req, res) => {
  // Your existing code for posting a comment...
  // After successfully posting the comment:
  const { comment } = req.body;
  const mentionedUsernames = extractMentions(comment);
  for (const username of mentionedUsernames) {
    // Find the user in your database
    const user = await User.findOne({ githubUsername: username });
    if (user) {
      const notification = new Notification({
        user: user._id,
        message: `You were mentioned in a PR comment by ${req.user.name}: "${comment.substring(0, 50)}..."`,
        link: `/project-tracking-dashboard?pr=${req.body.pullNumber}` // Adjust link as needed
      });
      await notification.save();
      // Optionally push via Socket.IO if available
      req.io && req.io.to(user._id.toString()).emit("newNotification", notification);
    }
  }
  // Then respond normally
  res.json({ message: "Comment posted successfully" });
};
