import React from "react";
import { PortalProvider } from "./providers/PortalProvider";
import { AppRoutes } from "./routes";

export default function App() {
  return (
    <PortalProvider>
      <AppRoutes />
    </PortalProvider>
  );
}
