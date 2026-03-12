import { useEffect } from "react";
import { User } from "firebase/auth";
import { UserProfile, UserRole, ViewState } from "../types";
import {
  areaForRole,
  buildPathForView,
  getDefaultViewForRole,
  isViewAllowedForRole,
  resolveAppRoute,
} from "../app/router/routes";

interface SyncViewArgs {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  view: ViewState;
  pathname: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
  selectedProjectId: string | null;
  selectedDeliveryId: string | null;
  setView: (view: ViewState) => void;
  setSelectedProjectId: (projectId: string | null) => void;
  setSelectedDeliveryId: (deliveryId: string | null) => void;
}

export function useSyncView({
  user,
  profile,
  role,
  view,
  pathname,
  navigate,
  selectedProjectId,
  selectedDeliveryId,
  setView,
  setSelectedProjectId,
  setSelectedDeliveryId,
}: SyncViewArgs) {
  useEffect(() => {
    const route = resolveAppRoute(pathname);

    if (!user) {
      const nextView =
        route.area === "public" && (route.view === "LOGIN" || route.view === "SIGNUP")
          ? route.view
          : "LOGIN";

      if (view !== nextView) {
        setView(nextView);
      }

      if (selectedProjectId !== null) {
        setSelectedProjectId(null);
      }

      if (selectedDeliveryId !== null) {
        setSelectedDeliveryId(null);
      }

      const expectedPath = buildPathForView({ view: nextView });
      if (expectedPath && pathname !== expectedPath) {
        navigate(expectedPath, { replace: route.area !== "public" });
      }
      return;
    }

    if (profile && (!profile.active || profile.status !== "ACTIVE")) {
      if (view !== "PENDING") {
        setView("PENDING");
      }

      if (selectedProjectId !== null) {
        setSelectedProjectId(null);
      }

      if (selectedDeliveryId !== null) {
        setSelectedDeliveryId(null);
      }

      if (pathname !== "/pending") {
        navigate("/pending", { replace: true });
      }
      return;
    }

    if (!profile || !role) return;

    const expectedArea = areaForRole(role);
    const fallbackView = isViewAllowedForRole(role, view) ? view : getDefaultViewForRole(role);
    const fallbackPath =
      buildPathForView({
        view: fallbackView,
        role,
        selectedProjectId,
        selectedDeliveryId,
      }) || buildPathForView({ view: getDefaultViewForRole(role), role });

    if (route.area === "public" || route.area === "unknown") {
      if (fallbackPath && pathname !== fallbackPath) {
        navigate(fallbackPath, { replace: true });
      }
      return;
    }

    if (route.area !== expectedArea || !route.view || !isViewAllowedForRole(role, route.view)) {
      if (fallbackPath && pathname !== fallbackPath) {
        navigate(fallbackPath, { replace: true });
      }
      return;
    }

    if (view !== route.view) {
      setView(route.view);
    }

    if (route.view === "DETALHE_PROJETO") {
      const projectId = route.params.projectId || null;
      if (selectedProjectId !== projectId) {
        setSelectedProjectId(projectId);
      }
    } else if (selectedProjectId !== null) {
      setSelectedProjectId(null);
    }

    if (route.view === "DETALHE_ENTREGA") {
      const deliveryId = route.params.deliveryId || null;
      if (selectedDeliveryId !== deliveryId) {
        setSelectedDeliveryId(deliveryId);
      }
    } else if (selectedDeliveryId !== null) {
      setSelectedDeliveryId(null);
    }
  }, [
    user,
    profile,
    role,
    view,
    pathname,
    navigate,
    selectedProjectId,
    selectedDeliveryId,
    setView,
    setSelectedProjectId,
    setSelectedDeliveryId,
  ]);
}
