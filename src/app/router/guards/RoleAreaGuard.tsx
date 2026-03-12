import React from "react";
import { User } from "firebase/auth";
import { RouteArea } from "../routes";
import { UserProfile, UserRole } from "../../../types";

interface RoleAreaGuardProps {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  requiredRole: UserRole;
  routeArea: RouteArea;
  children: React.ReactNode;
}

export default function RoleAreaGuard({
  user,
  profile,
  role,
  requiredRole,
  routeArea,
  children,
}: RoleAreaGuardProps) {
  const expectedArea = requiredRole === "ADMIN" ? "admin" : "provider";
  const isActiveUser = Boolean(user && profile?.active && profile.status === "ACTIVE");

  if (!user || !profile || !role) return null;
  if (!isActiveUser) return null;
  if (role !== requiredRole) return null;
  if (routeArea !== expectedArea) return null;

  return <>{children}</>;
}
