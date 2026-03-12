import React from "react";
import Shell from "../layout/Shell";

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  return <Shell area="provider">{children}</Shell>;
}
