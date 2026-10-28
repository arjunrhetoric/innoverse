import { publish } from "./bus";

export interface NotifyInput {
  title: string;
  message: string;
  link?: string | null;
  type?: "info" | "success" | "warning" | "error";
}

/**
 * Create an in-app notification and push it to the user's live channel.
 * Never throws — notifications must not break the action that triggered them.
 */
export async function notify(userId: string | null | undefined, input: NotifyInput) {
  if (!userId) return;
  try {
    const { connectDB, Notification } = await import("@innoverse/database");
    await connectDB();

    const notification = await Notification.create({
      userId,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      type: input.type ?? "info",
    });

    publish(`user:${userId}`, {
      type: "notification",
      action: "created",
      notificationId: String(notification._id),
      title: input.title,
      message: input.message,
      link: input.link ?? null,
    });
  } catch (err) {
    console.error("Notification write failed:", err);
  }
}
