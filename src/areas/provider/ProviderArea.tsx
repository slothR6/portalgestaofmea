import React from "react";
import { ViewState } from "../../types";
import ProviderLayout from "../../app/layouts/ProviderLayout";
import DashboardPage from "../../pages/Dashboard";
import MeetingsPage from "../../pages/MeetingsPage";
import ProjectsPage from "../../pages/Projects";
import ProjectDetailPage from "../../pages/ProjectDetail";
import DeliveriesPage from "../../pages/Deliveries";
import DeliveryDetailPage from "../../pages/DeliveryDetail";
import ProfilePage from "../../pages/Profile";

interface ProviderAreaProps {
  view: Extract<
    ViewState,
    | "DASHBOARD"
    | "REUNIOES"
    | "PROJETOS"
    | "DETALHE_PROJETO"
    | "ENTREGAS"
    | "DETALHE_ENTREGA"
    | "PERFIL"
  >;
}

export default function ProviderArea({ view }: ProviderAreaProps) {
  return (
    <ProviderLayout>
      {view === "DASHBOARD" ? <DashboardPage /> : null}
      {view === "REUNIOES" ? <MeetingsPage /> : null}
      {view === "PROJETOS" ? <ProjectsPage /> : null}
      {view === "DETALHE_PROJETO" ? <ProjectDetailPage /> : null}
      {view === "ENTREGAS" ? <DeliveriesPage /> : null}
      {view === "DETALHE_ENTREGA" ? <DeliveryDetailPage /> : null}
      {view === "PERFIL" ? <ProfilePage /> : null}
    </ProviderLayout>
  );
}
