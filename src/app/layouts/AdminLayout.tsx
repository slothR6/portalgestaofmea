import React from "react";
import Shell from "../layout/Shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Shell area="admin">{children}</Shell>;
}
