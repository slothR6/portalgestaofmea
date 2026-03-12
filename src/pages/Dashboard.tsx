import React, { useMemo } from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import { usePortalStore } from "../hooks/usePortalStore";
import {
  useCompaniesState,
  useDeliveriesState,
  useMeetingsState,
  useProjectsState,
} from "../hooks/usePortalCollections";
import { useOpportunities } from "../hooks/crm/useOpportunities";
import { useProposals } from "../hooks/crm/useProposals";
import { useShellActions } from "../app/layout/Shell";
import {
  deleteNotification as deleteNotificationSvc,
  markNotificationRead as markNotificationReadSvc,
  markNotificationsRead,
} from "../services/notifications";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import { getProposalApprovalIssues } from "../utils/proposals";
import { getProjectTypeLabel } from "../utils/projects";

function MetricCard({
  eyebrow,
  value,
  label,
  accent,
}: {
  eyebrow: string;
  value: string | number;
  label: string;
  accent: "brand" | "support" | "neutral";
}) {
  const accentStyles =
    accent === "brand"
      ? "bg-[#013d23] text-white"
      : accent === "support"
      ? "bg-[#d5d88e] text-[#013d23]"
      : "bg-[#e5e7ea] text-slate-800";

  return (
    <Card className="p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{eyebrow}</p>
      <div className={`mt-4 inline-flex rounded-2xl px-4 py-3 ${accentStyles}`}>
        <p className="text-3xl font-black">{value}</p>
      </div>
      <p className="mt-4 text-sm font-medium text-slate-600">{label}</p>
    </Card>
  );
}

function isLateDelivery(deadline?: string, status?: string) {
  if (!deadline || status === "APROVADO") return false;
  if (status === "ATRASADO") return true;
  const parsed = new Date(`${deadline}T23:59:59`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < Date.now();
}

export default function DashboardPage() {
  const { role, user, state, pushToast } = usePortalStore();
  const { companies } = useCompaniesState();
  const { projects } = useProjectsState();
  const { deliveries } = useDeliveriesState();
  const { meetings } = useMeetingsState();
  const { openCreateProject } = useShellActions();

  const onOpportunitiesError = React.useCallback(
    (message: string) => pushToast({ type: "error", title: "Erro ao carregar oportunidades", message }),
    [pushToast]
  );
  const onProposalsError = React.useCallback(
    (message: string) => pushToast({ type: "error", title: "Erro ao carregar propostas", message }),
    [pushToast]
  );

  const { opportunities } = useOpportunities({ onError: onOpportunitiesError, enabled: role === "ADMIN" });
  const { proposals } = useProposals({ onError: onProposalsError, enabled: role === "ADMIN" });

  const unreadNotifCount = state.notifications.filter((notification) => !notification.read).length;
  const todayWindow = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start: start.getTime(), end: end.getTime() };
  }, []);
  const meetingsToday = useMemo(
    () => meetings.filter((meeting) => meeting.startsAt >= todayWindow.start && meeting.startsAt < todayWindow.end),
    [meetings, todayWindow.end, todayWindow.start]
  );
  const lateDeliveries = useMemo(
    () => deliveries.filter((delivery) => isLateDelivery(delivery.deadline, delivery.status)),
    [deliveries]
  );

  const markNotificationRead = async (id: string) => {
    try {
      await markNotificationReadSvc(id);
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao marcar notificacao", message: error?.message || "" });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteNotificationSvc(id);
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao excluir notificacao", message: error?.message || "" });
    }
  };

  const markAllNotificationsRead = async () => {
    if (!user) return;
    try {
      const unread = state.notifications.filter((notification) => !notification.read);
      await markNotificationsRead(unread.map((notification) => notification.id));
      pushToast({ type: "success", title: "Notificacoes marcadas como lidas" });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao marcar notificacoes", message: error?.message || "" });
    }
  };

  if (role !== "ADMIN") {
    const providerProjects = projects.filter((project) => project.status !== "PROPOSTA" && project.status !== "RECUSADA");
    const providerPendingDeliveries = deliveries.filter((delivery) => delivery.status !== "APROVADO");

    return (
      <div className="space-y-8">
        <div className="rounded-[32px] border border-[#013d23]/10 bg-white px-8 py-7 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.45)]">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[#013d23]">Visao do prestador</p>
          <h1 className="mt-3 text-4xl font-black text-slate-950">Operacao em andamento</h1>
          <p className="mt-3 text-sm text-slate-500">
            Resumo rapido das entregas, projetos e reunioes vinculadas ao seu trabalho.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard eyebrow="Projetos" value={providerProjects.length} label="Projetos ativos" accent="brand" />
          <MetricCard eyebrow="Entregas" value={providerPendingDeliveries.length} label="Em aberto" accent="support" />
          <MetricCard eyebrow="Atrasos" value={lateDeliveries.length} label="Fora do prazo" accent="neutral" />
          <MetricCard eyebrow="Agenda" value={meetingsToday.length} label="Reunioes hoje" accent="support" />
          <MetricCard eyebrow="Avisos" value={unreadNotifCount} label="Notificacoes novas" accent="brand" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Entregas</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Fila prioritaria</h2>
            <div className="mt-6 space-y-3">
              {providerPendingDeliveries.slice(0, 8).map((delivery) => (
                <div key={delivery.id} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-slate-900">{delivery.title}</p>
                      <p className="mt-2 text-xs text-slate-500">{delivery.project}</p>
                      <p className="mt-1 text-xs text-slate-500">Prazo: {delivery.deadline || "Nao informado"}</p>
                    </div>
                    <Badge type="status" value={delivery.status} />
                  </div>
                </div>
              ))}
              {providerPendingDeliveries.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-sm text-slate-400">
                  Nenhuma entrega pendente no momento.
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="p-7">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Agenda</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Hoje</h2>
            <div className="mt-6 space-y-3">
              {meetingsToday.map((meeting) => (
                <div key={meeting.id} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                  <p className="font-black text-slate-900">{meeting.title}</p>
                  <p className="mt-2 text-sm text-slate-500">{formatDateTime(meeting.startsAt)}</p>
                </div>
              ))}
              {meetingsToday.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-sm text-slate-400">
                  Nenhuma reuniao agendada para hoje.
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const activeOpportunities = opportunities.filter(
    (opportunity) => opportunity.stage !== "GANHA" && opportunity.stage !== "PERDIDA"
  );
  const openProposals = proposals.filter((proposal) => proposal.status !== "APROVADA" && proposal.status !== "RECUSADA");
  const readyToApproveProposals = proposals.filter((proposal) => getProposalApprovalIssues(proposal).length === 0);
  const activeProjects = projects.filter(
    (project) => project.status !== "PROPOSTA" && project.status !== "RECUSADA" && project.status !== "CONCLUIDO"
  );
  const pausedProjects = projects.filter((project) => project.status === "PAUSADO");
  const plannedRevenue = activeProjects.reduce(
    (total, project) => total + (project.financial?.plannedRevenue || project.proposalValue || 0),
    0
  );
  const readyForContaAzul = activeProjects.filter((project) => project.financial?.syncStatus === "PRONTO");
  const priorityAlerts = [
    ...(lateDeliveries.length > 0 ? [`${lateDeliveries.length} entrega(s) atrasadas.`] : []),
    ...(pausedProjects.length > 0 ? [`${pausedProjects.length} projeto(s) pausados.`] : []),
    ...(readyToApproveProposals.length > 0 ? [`${readyToApproveProposals.length} proposta(s) prontas para aprovacao.`] : []),
  ];

  return (
    <div className="space-y-8">
      <div className="rounded-[32px] border border-[#013d23]/10 bg-white px-8 py-7 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-[#013d23]">Visao executiva</p>
            <h1 className="mt-3 text-4xl font-black text-slate-950">Comercial, projetos e alertas</h1>
            <p className="mt-3 text-sm text-slate-500">
              Painel consolidado do fluxo empresa, oportunidade, proposta e projeto com base operacional pronta para financeiro.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={markAllNotificationsRead} disabled={unreadNotifCount === 0}>
              Marcar notificacoes
            </Button>
            <Button onClick={openCreateProject}>Nova proposta</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard eyebrow="Projetos" value={activeProjects.length} label="Projetos ativos" accent="brand" />
        <MetricCard eyebrow="Propostas" value={openProposals.length} label="Propostas abertas" accent="support" />
        <MetricCard eyebrow="Agenda" value={meetingsToday.length} label="Reunioes hoje" accent="neutral" />
        <MetricCard eyebrow="Atrasos" value={lateDeliveries.length} label="Entregas em risco" accent="neutral" />
        <MetricCard eyebrow="Pipeline" value={activeOpportunities.length} label="Oportunidades em andamento" accent="support" />
        <MetricCard eyebrow="Alertas" value={priorityAlerts.length} label="Sinais executivos" accent="brand" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Alertas</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Prioridades do dia</h2>
            </div>
            <span className="rounded-full bg-[#d5d88e]/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#013d23]">
              {priorityAlerts.length} alerta(s)
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {priorityAlerts.map((alert) => (
              <div key={alert} className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                {alert}
              </div>
            ))}
            {priorityAlerts.length === 0 ? (
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
                Sem alertas executivos criticos no momento.
              </div>
            ) : null}
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Reunioes do dia</p>
            {meetingsToday.slice(0, 5).map((meeting) => (
              <div key={meeting.id} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-slate-900">{meeting.title}</p>
                    <p className="mt-2 text-sm text-slate-500">{formatDateTime(meeting.startsAt)}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-600">
                    {meeting.participantUids.length} participante(s)
                  </span>
                </div>
              </div>
            ))}
            {meetingsToday.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/60 px-5 py-8 text-sm text-slate-400">
                Nenhuma reuniao agendada para hoje.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="p-7">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Portifolio</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Projetos em destaque</h2>
            </div>
            <span className="rounded-full bg-[#013d23]/6 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#013d23]">
              {activeProjects.length} ativos
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {activeProjects.slice(0, 6).map((project) => (
              <div key={project.id} className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                      {project.companyName}
                    </p>
                    <h3 className="mt-2 text-lg font-black text-slate-900">{project.name}</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {getProjectTypeLabel(project.projectType, project.projectTypeOther)}
                    </p>
                  </div>
                  <Badge type="status" value={project.status.replace("_", " ")} />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 text-sm text-slate-600">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Progresso</p>
                    <p className="mt-2 font-black text-slate-900">{project.completionRate}%</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Modulos</p>
                    <p className="mt-2 font-black text-slate-900">{project.modules?.length || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Receita</p>
                    <p className="mt-2 font-black text-slate-900">
                      {formatCurrency(project.financial?.plannedRevenue || project.proposalValue)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {activeProjects.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-sm text-slate-400">
                Nenhum projeto ativo no momento.
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-7">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Comercial</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Pipeline e propostas</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-700">
              {companies.length} empresas
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Oportunidades ativas</p>
              <p className="mt-3 text-3xl font-black text-slate-900">{activeOpportunities.length}</p>
              <p className="mt-2 text-sm text-slate-500">Fora dos estagios GANHA e PERDIDA.</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Propostas prontas</p>
              <p className="mt-3 text-3xl font-black text-slate-900">{readyToApproveProposals.length}</p>
              <p className="mt-2 text-sm text-slate-500">Ja podem gerar projeto automaticamente.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {openProposals.slice(0, 6).map((proposal) => (
              <div key={proposal.id} className="rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-slate-900">{proposal.title}</p>
                    <p className="mt-2 text-xs text-slate-500">{proposal.companySnapshot.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatCurrency(proposal.value)}</p>
                  </div>
                  <Badge type="status" value={proposal.status} />
                </div>
              </div>
            ))}
            {openProposals.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-sm text-slate-400">
                Nenhuma proposta aberta.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Financeiro</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Base preparada</h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-[24px] border border-dashed border-[#013d23]/18 bg-[#013d23]/[0.03] p-5">
              <p className="text-sm font-bold text-slate-900">Receita prevista ativa</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(plannedRevenue)}</p>
            </div>
            <div className="rounded-[24px] border border-dashed border-[#013d23]/18 bg-[#013d23]/[0.03] p-5">
              <p className="text-sm font-bold text-slate-900">Projetos prontos para sync</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{readyForContaAzul.length}</p>
            </div>
            <div className="rounded-[24px] border border-dashed border-[#013d23]/18 bg-[#013d23]/[0.03] p-5">
              <p className="text-sm font-bold text-slate-900">Conta Azul</p>
              <p className="mt-2 text-sm text-slate-500">
                Estrutura em client + Firestore pronta para receber IDs externos, sync status e indicadores financeiros futuros.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-7">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Notificacoes</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Fila recente</h2>
          </div>
          {unreadNotifCount > 0 ? (
            <span className="rounded-full bg-[#d5d88e]/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#013d23]">
              {unreadNotifCount} nova(s)
            </span>
          ) : null}
        </div>

        <div className="mt-6 space-y-3">
          {state.notifications.slice(0, 10).map((notification) => (
            <div
              key={notification.id}
              className="flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 md:flex-row md:items-start md:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {!notification.read ? <Badge type="status" value="PENDENTE" /> : null}
                  <p className={`text-sm font-black ${notification.read ? "text-slate-700" : "text-slate-900"}`}>
                    {notification.title}
                  </p>
                </div>
                <p className="mt-2 text-xs text-slate-500">{formatDateTime(notification.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!notification.read ? (
                  <Button variant="outline" className="px-4 py-2" onClick={() => markNotificationRead(notification.id)}>
                    Marcar lida
                  </Button>
                ) : null}
                <Button variant="outline" className="px-4 py-2" onClick={() => deleteNotification(notification.id)}>
                  Remover
                </Button>
              </div>
            </div>
          ))}
          {state.notifications.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-center text-sm text-slate-400">
              Nenhuma notificacao no momento.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
