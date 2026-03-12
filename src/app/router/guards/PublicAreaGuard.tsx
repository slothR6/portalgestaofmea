import React from "react";
import { User } from "firebase/auth";
import { UserProfile } from "../../../types";

interface PublicAreaGuardProps {
  user: User | null;
  profile: UserProfile | null;
  children: React.ReactNode;
}

export default function PublicAreaGuard({ user, profile, children }: PublicAreaGuardProps) {
  const isActiveUser = Boolean(user && profile?.active && profile.status === "ACTIVE");
  if (isActiveUser) return null;
  return <>{children}</>;
}
