import React from "react";
import { PortalProvider } from "./providers/PortalProvider";
import { AppRouterProvider } from "./router/RouterProvider";
import { AppRoutes } from "./routes";

export default function App() {
  return (
    <AppRouterProvider>
      <PortalProvider>
        <AppRoutes />
      </PortalProvider>
    </AppRouterProvider>
  );
}
