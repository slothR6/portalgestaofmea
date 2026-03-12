import { type Dispatch } from "react";
import { PortalAction } from "../../app/providers/portalState";
import { UserProfile, UserRole } from "../../types";

export interface PortalSubscriptionsArgs {
  user: { uid: string } | null;
  profile: UserProfile | null;
  role: UserRole | null;
  pushToast: (payload: { type: "success" | "error" | "info"; title: string; message?: string }) => void;
  dispatch: Dispatch<PortalAction>;
}
