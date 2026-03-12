import React from "react";
import { usePortalStore } from "../hooks/usePortalStore";
import { isViewAllowedForRole } from "./router/routes";
import { useResolvedAppRoute } from "./router/useResolvedAppRoute";
import PublicAreaGuard from "./router/guards/PublicAreaGuard";
import PendingStatusGuard from "./router/guards/PendingStatusGuard";
import RoleAreaGuard from "./router/guards/RoleAreaGuard";
import PublicArea from "../areas/public/PublicArea";
import AdminArea from "../areas/admin/AdminArea";
import ProviderArea from "../areas/provider/ProviderArea";

export function AppRoutes() {
  const { authReady, user, profile, role, view } = usePortalStore();
  const route = useResolvedAppRoute();

  if (!authReady) return null;

  if (!user) {
    const publicView =
      route.area === "public" && (route.view === "LOGIN" || route.view === "SIGNUP")
        ? route.view
        : view === "SIGNUP"
        ? "SIGNUP"
        : "LOGIN";

    return (
      <PublicAreaGuard user={user} profile={profile}>
        <PublicArea view={publicView} />
      </PublicAreaGuard>
    );
  }

  if (user && profile && (!profile.active || profile.status !== "ACTIVE")) {
    return (
      <PendingStatusGuard user={user} profile={profile}>
        <PublicArea view="PENDING" />
      </PendingStatusGuard>
    );
  }

  if (!user || !profile || !role) return null;

  if (route.area === "public" || route.area === "unknown" || !route.view || !isViewAllowedForRole(role, route.view)) {
    return null;
  }

  if (role === "ADMIN") {
    const adminView = route.view as React.ComponentProps<typeof AdminArea>["view"];
    return (
      <RoleAreaGuard user={user} profile={profile} role={role} requiredRole="ADMIN" routeArea={route.area}>
        <AdminArea view={adminView} />
      </RoleAreaGuard>
    );
  }

  const providerView = route.view as React.ComponentProps<typeof ProviderArea>["view"];
  return (
    <RoleAreaGuard
      user={user}
      profile={profile}
      role={role}
      requiredRole="PRESTADOR"
      routeArea={route.area}
    >
      <ProviderArea view={providerView} />
    </RoleAreaGuard>
  );
}
