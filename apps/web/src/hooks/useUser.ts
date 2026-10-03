"use client";

import { useSession } from "next-auth/react";

export function useUser() {
  const { data: session, status } = useSession();

  const role = session?.user?.role ?? null;

  return {
    user: session?.user || null,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    role,
    dashboardPath: !role
      ? "/role-selection"
      : role === "Student"
        ? "/dashboard/student"
        : "/dashboard/startup",
  };
}
