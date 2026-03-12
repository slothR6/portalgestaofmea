import React from "react";
import Shell from "../layout/Shell";

export default function AreaLayout({
  children,
  area = "admin",
}: {
  children: React.ReactNode;
  area?: "admin" | "provider";
}) {
  return <Shell area={area}>{children}</Shell>;
}
