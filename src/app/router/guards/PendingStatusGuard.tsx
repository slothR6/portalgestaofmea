import React from "react";
import { User } from "firebase/auth";
import { UserProfile } from "../../../types";

interface PendingStatusGuardProps {
  user: User | null;
  profile: UserProfile | null;
  children: React.ReactNode;
}

export default function PendingStatusGuard({ user, profile, children }: PendingStatusGuardProps) {
  const isPendingUser = Boolean(user && profile && (!profile.active || profile.status !== "ACTIVE"));
  if (!isPendingUser) return null;
  return <>{children}</>;
}
