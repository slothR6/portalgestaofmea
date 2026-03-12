import React from "react";
import { ViewState } from "../../types";
import AdminLayout from "../../app/layouts/AdminLayout";
import DashboardPage from "../../pages/Dashboard";
import MeetingsPage from "../../pages/MeetingsPage";
import UsersPage from "../../pages/Users";
import ProvidersPage from "../../pages/Providers";
import ProjectsPage from "../../pages/Projects";
import ProposalsPage from "../../pages/Proposals";
import OpportunitiesPage from "../../pages/OpportunitiesPage";
import ProjectDetailPage from "../../pages/ProjectDetail";
import DeliveriesPage from "../../pages/Deliveries";
import DeliveryDetailPage from "../../pages/DeliveryDetail";
import ProfilePage from "../../pages/Profile";
import CompaniesPage from "../../pages/CompaniesPage";

interface AdminAreaProps {
  view: Extract<
    ViewState,
    | "DASHBOARD"
    | "REUNIOES"
    | "USUARIOS"
    | "PRESTADORES"
    | "EMPRESAS"
    | "OPORTUNIDADES"
    | "PROPOSTAS"
    | "PROJETOS"
    | "DETALHE_PROJETO"
    | "ENTREGAS"
    | "DETALHE_ENTREGA"
    | "PERFIL"
  >;
}

export default function AdminArea({ view }: AdminAreaProps) {
  return (
    <AdminLayout>
      {view === "DASHBOARD" ? <DashboardPage /> : null}
      {view === "REUNIOES" ? <MeetingsPage /> : null}
      {view === "USUARIOS" ? <UsersPage /> : null}
      {view === "PRESTADORES" ? <ProvidersPage /> : null}
      {view === "EMPRESAS" ? <CompaniesPage /> : null}
      {view === "OPORTUNIDADES" ? <OpportunitiesPage /> : null}
      {view === "PROPOSTAS" ? <ProposalsPage /> : null}
      {view === "PROJETOS" ? <ProjectsPage /> : null}
      {view === "DETALHE_PROJETO" ? <ProjectDetailPage /> : null}
      {view === "ENTREGAS" ? <DeliveriesPage /> : null}
      {view === "DETALHE_ENTREGA" ? <DeliveryDetailPage /> : null}
      {view === "PERFIL" ? <ProfilePage /> : null}
    </AdminLayout>
  );
}
