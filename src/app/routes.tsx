import React from "react";
import { usePortalStore } from "../hooks/usePortalStore";
import Shell from "./layout/Shell";
import LoginPage from "../pages/Login";
import SignupPage from "../pages/Signup";
import PendingPage from "../pages/Pending";
import DashboardPage from "../pages/Dashboard";
import MeetingsPage from "../pages/MeetingsPage";
import UsersPage from "../pages/Users";
import ProvidersPage from "../pages/Providers";
import ProjectsPage from "../pages/Projects";
import ProposalsPage from "../pages/Proposals";
import ProjectDetailPage from "../pages/ProjectDetail";
import DeliveriesPage from "../pages/Deliveries";
import DeliveryDetailPage from "../pages/DeliveryDetail";
import ProfilePage from "../pages/Profile";
import CompaniesPage from "../pages/CompaniesPage";

export function AppRoutes() {
  const { authReady, user, profile, role, view } = usePortalStore();

  if (!authReady) return null;

  if (!user && view === "LOGIN") {
    return <LoginPage />;
  }

  if (!user && view === "SIGNUP") {
    return <SignupPage />;
  }

  if (user && profile && (!profile.active || profile.status !== "ACTIVE")) {
    return <PendingPage />;
  }

  if (!user || !profile || !role) return null;

  return (
    <Shell>
      {view === "DASHBOARD" && <DashboardPage />}
      {view === "REUNIOES" && <MeetingsPage />}
      {view === "USUARIOS" && role === "ADMIN" && <UsersPage />}
      {view === "PRESTADORES" && role === "ADMIN" && <ProvidersPage />}
      {view === "EMPRESAS" && role === "ADMIN" && <CompaniesPage />}
      {view === "PROPOSTAS" && role === "ADMIN" && <ProposalsPage />}
      {view === "PROJETOS" && <ProjectsPage />}
      {view === "DETALHE_PROJETO" && <ProjectDetailPage />}
      {view === "ENTREGAS" && <DeliveriesPage />}
      {view === "DETALHE_ENTREGA" && <DeliveryDetailPage />}
      {view === "PERFIL" && <ProfilePage />}
    </Shell>
  );
}
