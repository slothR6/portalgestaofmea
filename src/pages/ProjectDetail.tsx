import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import { useAppRouter } from "../app/router/RouterProvider";
import { usePortalStore } from "../hooks/usePortalStore";
import {
  useDeliveriesState,
  useMeetingsState,
  useProjectsState,
} from "../hooks/usePortalCollections";
import { useProjectDetailState } from "../hooks/usePortalDetails";
import { useShellActions } from "../app/layout/Shell";
import { deleteDelivery, updateProject as updateProjectSvc } from "../services/portal";
import { Delivery, ExternalLink } from "../types";
import { sanitize } from "../utils/sanitize";
import { isValidExternalUrl } from "../utils/urls";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import {
  getProjectModuleDescription,
  getProjectModuleLabel,
  getProjectTypeLabel,
} from "../utils/projects";

function buildExternalLink(title: string, url: string, uid: string): ExternalLink {
  return {
    id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    url,
    createdAt: Date.now(),
    createdByUid: uid,
  };
}

function isLateDelivery(delivery: Delivery) {
  if (delivery.status === "APROVADO") return false;
  if (delivery.status === "ATRASADO") return true;
  if (!delivery.deadline) return false;
  const deadline = new Date(`${delivery.deadline}T23:59:59`);
  if (Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() < Date.now();
}

export default function ProjectDetailPage() {
  const { role, pushToast, setView, user, state } = usePortalStore();
  const { navigate } = useAppRouter();
  const { deliveries, loadingDeliveries, selectedDeliveryId, setSelectedDeliveryId } = useDeliveriesState();
  const { meetings } = useMeetingsState();
  const { loadingProjects } = useProjectsState();
  const { projectId, selectedProject } = useProjectDetailState();
  const { openEditProject, openCreateDelivery } = useShellActions();
  const [projectLinkForm, setProjectLinkForm] = useState({ title: "", url: "" });

  useEffect(() => {
    if (!projectId || loadingProjects || selectedProject) return;
    navigate(role === "ADMIN" ? "/admin/projects" : "/provider/projects", { replace: true });
  }, [projectId, loadingProjects, selectedProject, navigate, role]);

  const projectDeliveries = useMemo(
    () => deliveries.filter((delivery) => delivery.projectId === selectedProject?.id),
    [deliveries, selectedProject?.id]
  );
  const pendingDeliveries = useMemo(
    () => projectDeliveries.filter((delivery) => delivery.status !== "APROVADO"),
    [projectDeliveries]
  );
  const lateDeliveries = useMemo(
    () => projectDeliveries.filter((delivery) => isLateDelivery(delivery)),
    [projectDeliveries]
  );
  const approvedDeliveries = useMemo(
    () => projectDeliveries.filter((delivery) => delivery.status === "APROVADO"),
    [projectDeliveries]
  );
  const completionRate = useMemo(() => {
    if (projectDeliveries.length === 0) {
      return selectedProject?.completionRate || 0;
    }
    return Math.round((approvedDeliveries.length / projectDeliveries.length) * 100);
  }, [approvedDeliveries.length, projectDeliveries.length, selectedProject?.completionRate]);
  const teamUids = useMemo(() => {
    if (!selectedProject) return [];
    return Array.from(new Set([selectedProject.managerUid, ...(selectedProject.memberUids || [])].filter(Boolean)));
  }, [selectedProject]);
  const teamMembers = useMemo(
    () => state.users.filter((userProfile) => teamUids.includes(userProfile.uid)),
    [state.users, teamUids]
  );
  const upcomingMeetings = useMemo(() => {
    if (!selectedProject) return [];
    return meetings
      .filter(
        (meeting) =>
          meeting.status === "SCHEDULED" &&
          meeting.endsAt >= Date.now() &&
          meeting.participantUids.some((uid) => teamUids.includes(uid))
      )
      .sort((a, b) => a.startsAt - b.startsAt)
      .slice(0, 4);
  }, [meetings, selectedProject, teamUids]);
  const executiveRiskNotes = useMemo(() => {
    if (!selectedProject) return [];
    return [
      selectedProject.executiveSummary?.mainRisk || null,
      lateDeliveries.length > 0 ? `${lateDeliveries.length} entrega(s) com atraso ou risco de atraso.` : null,
      selectedProject.status === "PAUSADO" ? "Projeto pausado e dependente de replanejamento." : null,
    ].filter((entry): entry is string => Boolean(entry));
  }, [lateDeliveries.length, selectedProject]);

  if (!selectedProject) return null;

  const isProposal = selectedProject.status === "PROPOSTA";
  const isRejected = selectedProject.status === "RECUSADA";
  const projectTypeLabel = getProjectTypeLabel(selectedProject.projectType, selectedProject.projectTypeOther);
  const executiveScope =
    selectedProject.executiveSummary?.scope ||
    selectedProject.scopeSummary ||
    selectedProject.description ||
    "Escopo executivo ainda nao detalhado.";
  const financialSyncStatus = selectedProject.financial?.syncStatus || "NAO_CONFIGURADO";
  const financialPlannedRevenue =
    typeof selectedProject.financial?.plannedRevenue === "number"
      ? selectedProject.financial.plannedRevenue
      : selectedProject.proposalValue;

  const addProjectLink = async () => {
    if (!selectedProject || !user || role !== "ADMIN") return;
    const title = sanitize(projectLinkForm.title);
    const url = sanitize(projectLinkForm.url);

    if (!title) return pushToast({ type: "error", title: "Informe o titulo do link" });
    if (!url || !isValidExternalUrl(url)) {
      return pushToast({ type: "error", title: "URL invalida (use http:// ou https://)" });
    }

    try {
      const nextLinks = [...(selectedProject.externalLinks || []), buildExternalLink(title, url, user.uid)];
      await updateProjectSvc(selectedProject.id, { externalLinks: nextLinks });
      setProjectLinkForm({ title: "", url: "" });
      pushToast({ type: "success", title: "Link adicionado ao projeto" });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao adicionar link", message: error?.message || "" });
    }
  };

  const removeProjectLink = async (linkId: string) => {
    if (!selectedProject || !user || role !== "ADMIN") return;
    const nextLinks = (selectedProject.externalLinks || []).filter((link) => link.id !== linkId);
    try {
      await updateProjectSvc(selectedProject.id, { externalLinks: nextLinks });
      pushToast({ type: "success", title: "Link removido do projeto" });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao remover link", message: error?.message || "" });
    }
  };

  const removeDelivery = async (deliveryId: string, title: string) => {
    if (!confirm(`Excluir entrega "${title}"?`)) return;
    try {
      await deleteDelivery(deliveryId);
      pushToast({ type: "success", title: "Entrega excluida" });
      if (selectedDeliveryId === deliveryId) setSelectedDeliveryId(null);
      setView("ENTREGAS");
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao excluir entrega", message: error?.message || "" });
    }
  };

  const approveLegacyProposal = async () => {
    if (!isProposal || role !== "ADMIN") return;
    try {
      await updateProjectSvc(selectedProject.id, { status: "EM_ANDAMENTO" });
      pushToast({ type: "success", title: "Proposta aprovada" });
      setView("PROJETOS");
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao aprovar proposta", message: error?.message || "" });
    }
  };

  const rejectLegacyProposal = async () => {
    if (!isProposal || role !== "ADMIN") return;
    if (!confirm(`Recusar a proposta "${selectedProject.name}"?`)) return;
    try {
      await updateProjectSvc(selectedProject.id, { status: "RECUSADA" });
      pushToast({ type: "success", title: "Proposta recusada" });
      setView("PROPOSTAS");
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao recusar proposta", message: error?.message || "" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[32px] border border-[#013d23]/10 bg-white px-8 py-7 shadow-[0_28px_70px_-55px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <button
              onClick={() => setView(isProposal ? "PROPOSTAS" : "PROJETOS")}
              className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 hover:text-[#013d23] text-left"
            >
              Voltar
            </button>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Badge type="status" value={selectedProject.status.replace("_", " ")} />
              <span className="rounded-full bg-[#d5d88e]/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#013d23]">
                {projectTypeLabel}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-600">
                {completionRate}% concluido
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-black text-slate-950">{selectedProject.name}</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-500">{executiveScope}</p>
          </div>

          {role === "ADMIN" ? (
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" onClick={() => openEditProject(selectedProject)}>
                Editar estrutura
              </Button>
              {!isProposal && !isRejected ? (
                <Button variant="primary" onClick={() => openCreateDelivery(selectedProject.id)}>
                  + Solicitar entrega
                </Button>
              ) : null}
              {isProposal ? (
                <>
                  <Button variant="primary" onClick={approveLegacyProposal}>
                    Aprovar proposta
                  </Button>
                  <Button variant="danger" onClick={rejectLegacyProposal}>
                    Recusar proposta
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card className="p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Status</p>
          <p className="mt-3 text-xl font-black text-slate-900">{selectedProject.status.replace("_", " ")}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Progresso</p>
          <p className="mt-3 text-xl font-black text-slate-900">{completionRate}%</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Equipe</p>
          <p className="mt-3 text-xl font-black text-slate-900">{teamUids.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Entregas pendentes</p>
          <p className="mt-3 text-xl font-black text-slate-900">{pendingDeliveries.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Entregas em atraso</p>
          <p className="mt-3 text-xl font-black text-slate-900">{lateDeliveries.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Financeiro</p>
          <p className="mt-3 text-sm font-black text-slate-900">{financialSyncStatus}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Resumo executivo</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Leitura rapida do projeto</h2>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Escopo resumido</p>
              <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{executiveScope}</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Momento atual</p>
              <p className="mt-3 text-sm text-slate-600">
                {selectedProject.executiveSummary?.currentMoment || "Sem apontamento executivo registrado."}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Proximo passo</p>
              <p className="mt-3 text-sm text-slate-600">
                {selectedProject.executiveSummary?.nextStep || "Acompanhar plano de entregas e reunioes."}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Indicadores chave</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>{projectDeliveries.length} entregas no projeto</p>
                <p>{approvedDeliveries.length} entregas aprovadas</p>
                <p>{upcomingMeetings.length} reunioes proximas da equipe</p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Riscos e alertas</p>
                <p className="text-sm text-slate-500 mt-1">Consolidacao executiva do que merece atencao.</p>
              </div>
              <span className="rounded-full bg-[#e5e7ea] px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-700">
                {executiveRiskNotes.length} alerta(s)
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {executiveRiskNotes.length > 0 ? (
                executiveRiskNotes.map((risk) => (
                  <div key={risk} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {risk}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Sem alertas criticos no momento.
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Nucleo padrao</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Estrutura base</h2>
            <div className="mt-6 space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Informacoes gerais</p>
                <p className="mt-2 font-bold text-slate-800">{selectedProject.companyName}</p>
                <p className="mt-1">Codigo: {selectedProject.proposalCode || "Nao informado"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Equipe</p>
                <p className="mt-2 font-bold text-slate-800">{selectedProject.manager || "Gestor nao informado"}</p>
                <p className="mt-1">{teamMembers.length} membro(s) ativos vinculados.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Reunioes</p>
                <p className="mt-2 font-bold text-slate-800">{upcomingMeetings.length} proximas reunioes</p>
                <p className="mt-1">A lista usa a equipe do projeto como referencia.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Resumo financeiro</p>
                <p className="mt-2 font-bold text-slate-800">{formatCurrency(financialPlannedRevenue)}</p>
                <p className="mt-1">Conta Azul: {financialSyncStatus}</p>
              </div>
            </div>
          </Card>

          <Card className="p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Agenda</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Proximas reunioes</h2>
            <div className="mt-6 space-y-3">
              {upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="font-black text-slate-900">{meeting.title}</p>
                  <p className="mt-2 text-sm text-slate-500">{formatDateTime(meeting.startsAt)}</p>
                </div>
              ))}
              {upcomingMeetings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-sm text-slate-400">
                  Nenhuma reuniao futura relacionada a equipe do projeto.
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-7">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Modulos opcionais</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Arquitetura modular</h2>
            </div>
            <span className="rounded-full bg-[#013d23]/6 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#013d23]">
              {(selectedProject.modules || []).length} modulo(s)
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            {(selectedProject.modules || []).map((moduleDef) => (
              <div key={moduleDef.key} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-900">{getProjectModuleLabel(moduleDef.key)}</p>
                  <Badge type="status" value={moduleDef.status.replace("_", " ")} />
                </div>
                <p className="mt-3 text-sm text-slate-500">{getProjectModuleDescription(moduleDef.key)}</p>
                <p className="mt-3 text-sm text-slate-600">
                  {moduleDef.summary || "Modulo habilitado e pronto para evolucao operacional."}
                </p>
              </div>
            ))}
            {(selectedProject.modules || []).length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-sm text-slate-400 md:col-span-2">
                Nenhum bloco opcional ativo. Use a edicao do projeto para habilitar modulos.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Financeiro</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Base pronta para Conta Azul</h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-[24px] border border-dashed border-[#013d23]/18 bg-[#013d23]/[0.03] p-5">
              <p className="text-sm font-bold text-slate-900">Sync status</p>
              <p className="mt-2 text-sm text-slate-500">{financialSyncStatus}</p>
            </div>
            <div className="rounded-[24px] border border-dashed border-[#013d23]/18 bg-[#013d23]/[0.03] p-5">
              <p className="text-sm font-bold text-slate-900">Receita prevista</p>
              <p className="mt-2 text-sm text-slate-500">{formatCurrency(financialPlannedRevenue)}</p>
            </div>
            <div className="rounded-[24px] border border-dashed border-[#013d23]/18 bg-[#013d23]/[0.03] p-5">
              <p className="text-sm font-bold text-slate-900">Proxima etapa</p>
              <p className="mt-2 text-sm text-slate-500">
                Estrutura reservada para cadastro de cliente, projeto e faturamento sem usar Cloud Functions.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-7">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Links do projeto</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Referencias operacionais</h2>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {(selectedProject.externalLinks || []).map((link) => (
              <div
                key={link.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-black text-slate-900 truncate">{link.title}</p>
                  <p className="mt-1 text-xs text-slate-500 truncate">{link.url}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <a
                    className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-slate-700"
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir
                  </a>
                  {role === "ADMIN" ? (
                    <Button variant="outline" onClick={() => removeProjectLink(link.id)}>
                      Remover
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            {(selectedProject.externalLinks || []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-sm text-slate-400">
                Nenhum link cadastrado.
              </div>
            ) : null}
          </div>

          {role === "ADMIN" ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Adicionar link</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={projectLinkForm.title}
                  onChange={(event) => setProjectLinkForm((form) => ({ ...form, title: event.target.value }))}
                  className="px-4 py-3 border border-gray-100 rounded-xl"
                  placeholder="Titulo"
                />
                <input
                  value={projectLinkForm.url}
                  onChange={(event) => setProjectLinkForm((form) => ({ ...form, url: event.target.value }))}
                  className="px-4 py-3 border border-gray-100 rounded-xl"
                  placeholder="https://..."
                />
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={addProjectLink}>Adicionar link</Button>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Equipe</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Responsaveis</h2>
          <div className="mt-6 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Gestor</p>
              <p className="mt-2 text-sm font-black text-slate-900">{selectedProject.manager}</p>
            </div>
            {teamMembers
              .filter((member) => member.uid !== selectedProject.managerUid)
              .map((member) => (
                <div key={member.uid} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-black text-slate-900">{member.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{member.email}</p>
                </div>
              ))}
            {teamMembers.filter((member) => member.uid !== selectedProject.managerUid).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-sm text-slate-400">
                Nenhum membro adicional vinculado.
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      {isProposal ? (
        <Card>
          <h3 className="text-xl mb-4">Entregas do projeto</h3>
          <p className="text-sm text-gray-500">
            A proposta ainda nao foi aprovada. As entregas serao liberadas apos a aprovacao.
          </p>
        </Card>
      ) : isRejected ? (
        <Card>
          <h3 className="text-xl mb-4">Entregas do projeto</h3>
          <p className="text-sm text-gray-500">Proposta recusada. Este registro ficou apenas para historico.</p>
        </Card>
      ) : (
        <Card className="p-7">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Entregas</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Backlog operacional</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-700">
              {projectDeliveries.length} entrega(s)
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {projectDeliveries.map((delivery) => (
              <div
                key={delivery.id}
                onClick={() => {
                  setSelectedDeliveryId(delivery.id);
                  setView("DETALHE_ENTREGA");
                }}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 hover:bg-slate-50 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <p className="font-black text-slate-900">{delivery.title}</p>
                  <p className="mt-2 text-xs text-slate-500">Prestador: {delivery.provider}</p>
                  <p className="text-xs text-slate-500">Prazo: {delivery.deadline || "Nao informado"}</p>
                </div>
                <div className="flex gap-3 items-center flex-wrap">
                  <Badge type="priority" value={delivery.priority} />
                  <Badge type="status" value={delivery.status} />
                  {role === "ADMIN" ? (
                    <Button
                      variant="danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeDelivery(delivery.id, delivery.title);
                      }}
                    >
                      Excluir
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            {!loadingDeliveries && projectDeliveries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-sm text-slate-400">
                Nenhuma entrega cadastrada ainda.
              </div>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
}
