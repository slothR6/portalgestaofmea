import { UserRole, UserProfile } from "../types";
import { useMemo } from "react";

export function usePermissions(profile: UserProfile | null, role: UserRole | null) {
  return useMemo(() => {
    const isAdmin = role === "ADMIN";
    const isProvider = role === "PRESTADOR";
    const isActive = Boolean(profile?.active && profile?.status === "ACTIVE");
    return {
      isAdmin,
      isProvider,
      isActive,
      canManageUsers: isAdmin,
      canManageCompanies: isAdmin,
      canManageProjects: isAdmin,
      canManageMeetings: isAdmin,
      canManageProviders: isAdmin,
      canViewDashboard: Boolean(role),
    };
  }, [profile, role]);
}
