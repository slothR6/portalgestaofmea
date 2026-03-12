import React from "react";
import { ViewState } from "../../types";
import LoginPage from "../../pages/Login";
import SignupPage from "../../pages/Signup";
import PendingPage from "../../pages/Pending";
import PublicLayout from "../../app/layouts/PublicLayout";

interface PublicAreaProps {
  view: Extract<ViewState, "LOGIN" | "SIGNUP" | "PENDING">;
}

export default function PublicArea({ view }: PublicAreaProps) {
  return (
    <PublicLayout>
      {view === "SIGNUP" ? <SignupPage /> : null}
      {view === "PENDING" ? <PendingPage /> : null}
      {view === "LOGIN" ? <LoginPage /> : null}
    </PublicLayout>
  );
}
