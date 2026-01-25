import { useEffect } from "react";
import { User } from "firebase/auth";
import { UserProfile, ViewState } from "../types";

interface SyncViewArgs {
  user: User | null;
  profile: UserProfile | null;
  view: ViewState;
  setView: (view: ViewState) => void;
}

export function useSyncView({ user, profile, view, setView }: SyncViewArgs) {
  useEffect(() => {
    if (user && profile && view === "LOGIN") {
      setView(profile.role === "ADMIN" ? "DASHBOARD" : "ENTREGAS");
    }
  }, [user, profile, view, setView]);
}
