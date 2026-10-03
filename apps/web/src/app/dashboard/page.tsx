import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardRouter() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const role = session?.user?.role;

  if (!role) {
    redirect("/role-selection");
  }

  if (role === "Student") {
    redirect("/dashboard/student");
  } else if (role === "Startup") {
    redirect("/dashboard/startup");
  }

  // Fallback if role is invalid
  redirect("/role-selection");
}
