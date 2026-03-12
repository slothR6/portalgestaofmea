import React, { useEffect, useMemo, useState } from "react";
import { useAppRouter } from "../app/router/RouterProvider";
import { useResolvedAppRoute } from "../app/router/useResolvedAppRoute";
import { usePortalStore } from "../hooks/usePortalStore";
import { useProjectsState } from "../hooks/usePortalCollections";
import { useOpportunities } from "../hooks/crm/useOpportunities";
import { useProposals } from "../hooks/crm/useProposals";
import { approveProposalAndCreateProject, createProposal, updateProposal } from "../services/proposals";
import { Opportunity, Proposal, ProposalStatus } from "../types";
import { sanitize } from "../utils/sanitize";
import Badge from "../components/common/Badge";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import { getProposalApprovalIssues } from "../utils/proposals";
import { getProjectTypeLabel } from "../utils/projects";

const emptyForm = {
  opportunityId: "",
  title: "",
  scopeSummary: "",
  value: "",
  status: "EM_ANALISE" as ProposalStatus,
};

const editableStatuses: ProposalStatus[] = ["RASCUNHO", "EM_ANALISE", "RECUSADA"];

function buildProposalPayload(
  opportunity: Opportunity,
  proposal: typeof emptyForm,
  ownerName?: string
): Omit<Proposal, "id" | "createdAt" | "updatedAt"> {
  const sanitizedTitle = sanitize(proposal.title);
  const sanitizedSummary = sanitize(proposal.scopeSummary);
  const parsedValue = proposal.value.trim() ? Number(proposal.value.replace(",", ".")) : undefined;

  return {
    companyId: opportunity.companyId,
    opportunityId: opportunity.id,
    title: sanitizedTitle,
    ...(sanitizedSummary ? { scopeSummary: sanitizedSummary } : {}),
    ...(typeof parsedValue === "number" && !Number.isNaN(parsedValue) ? { value: parsedValue } : {}),
    status: proposal.status,
    ownerUid: opportunity.ownerUid,
    ...(ownerName ? { ownerName } : {}),
    companySnapshot: {
      id: opportunity.companySnapshot.id,
      name: opportunity.companySnapshot.name,
    },
    opportunitySnapshot: {
      id: opportunity.id,
      title: opportunity.title,
      stage: opportunity.stage,
      ...(opportunity.primaryContactId ? { primaryContactId: opportunity.primaryContactId } : {}),
      ...(opportunity.contactSnapshot?.name ? { contactName: opportunity.contactSnapshot.name } : {}),
      ...(opportunity.source ? { source: opportunity.source } : {}),
      ...(opportunity.serviceType ? { serviceType: opportunity.serviceType } : {}),
      ...(typeof opportunity.estimatedValue === "number" ? { estimatedValue: opportunity.estimatedValue } : {}),
    },
  };
}

function buildDraftForm(opportunity: Opportunity | null): typeof emptyForm {
  if (!opportunity) return { ...emptyForm };

  return {
    opportunityId: opportunity.id,
    title: opportunity.title,
    scopeSummary: "",
    value: typeof opportunity.estimatedValue === "number" ? String(opportunity.estimatedValue) : "",
    status: "EM_ANALISE",
  };
}

export default function ProposalsPage() {
  const { profile, pushToast, setView, state, actions } = usePortalStore();
  const { projects, setSelectedProjectId } = useProjectsState();
  const route = useResolvedAppRoute();
  const { navigate } = useAppRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const draftOpportunityId = state.proposalDraftOpportunityId;

  const onProposalsError = React.useCallback(
    (message: string) => pushToast({ type: "error", title: "Erro ao carregar propostas", message }),
    [pushToast]
  );
  const onOpportunitiesError = React.useCallback(
    (message: string) => pushToast({ type: "error", title: "Erro ao carregar oportunidades", message }),
    [pushToast]
  );

  const { proposals, loadingProposals } = useProposals({ onError: onProposalsError });
  const { opportunities, loadingOpportunities } = useOpportunities({ onError: onOpportunitiesError });

  const legacyProposals = useMemo(
    () => projects.filter((project) => project.status === "PROPOSTA"),
    [projects]
  );

  const routeProposalId = route.view === "PROPOSTAS" ? route.params.proposalId || null : null;
  const selectedProposal = useMemo(
    () => proposals.find((proposal) => proposal.id === routeProposalId) || null,
    [proposals, routeProposalId]
  );

  const selectedOpportunity = useMemo(
    () => opportunities.find((opportunity) => opportunity.id === form.opportunityId) || null,
    [opportunities, form.opportunityId]
  );
  const draftOpportunity = useMemo(
    () => opportunities.find((opportunity) => opportunity.id === draftOpportunityId) || null,
    [opportunities, draftOpportunityId]
  );
  const approvalIssues = useMemo(
    () => (selectedProposal ? getProposalApprovalIssues(selectedProposal) : []),
    [selectedProposal]
  );

  useEffect(() => {
    if (!routeProposalId) {
      return;
    }

    if (!loadingProposals && !selectedProposal) {
      navigate("/admin/proposals", { replace: true });
      return;
    }

    if (selectedProposal && !isEditing) {
      setForm({
        opportunityId: selectedProposal.opportunityId,
        title: selectedProposal.title,
        scopeSummary: selectedProposal.scopeSummary || "",
        value: typeof selectedProposal.value === "number" ? String(selectedProposal.value) : "",
        status: selectedProposal.status,
      });
      actions.setProposalDraftOpportunityId(null);
    }
  }, [actions, isEditing, loadingProposals, navigate, routeProposalId, selectedProposal]);

  useEffect(() => {
    if (routeProposalId || isEditing || !draftOpportunity) return;
    setForm(buildDraftForm(draftOpportunity));
    setIsEditing(false);
    actions.setProposalDraftOpportunityId(null);
  }, [actions, draftOpportunity, isEditing, routeProposalId]);

  const startCreate = (opportunityId?: string | null) => {
    setIsEditing(false);
    const nextOpportunity =
      (opportunityId ? opportunities.find((entry) => entry.id === opportunityId) : null) || null;
    setForm(buildDraftForm(nextOpportunity));
    actions.setProposalDraftOpportunityId(opportunityId || null);
    navigate("/admin/proposals");
  };

  const startEdit = () => {
    if (!selectedProposal || selectedProposal.status === "APROVADA" || selectedProposal.projectId) return;
    setIsEditing(true);
    setForm({
      opportunityId: selectedProposal.opportunityId,
      title: selectedProposal.title,
      scopeSummary: selectedProposal.scopeSummary || "",
      value: typeof selectedProposal.value === "number" ? String(selectedProposal.value) : "",
      status: selectedProposal.status,
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    if (selectedProposal) {
      setForm({
        opportunityId: selectedProposal.opportunityId,
        title: selectedProposal.title,
        scopeSummary: selectedProposal.scopeSummary || "",
        value: typeof selectedProposal.value === "number" ? String(selectedProposal.value) : "",
        status: selectedProposal.status,
      });
      navigate(`/admin/proposals/${encodeURIComponent(selectedProposal.id)}`);
      return;
    }
    actions.setProposalDraftOpportunityId(null);
    setForm({ ...emptyForm });
    navigate("/admin/proposals");
  };

  const submitForm = async () => {
    const opportunity = opportunities.find((entry) => entry.id === form.opportunityId) || null;
    const title = sanitize(form.title);

    if (!opportunity) {
      pushToast({ type: "error", title: "Selecione uma oportunidade valida" });
      return;
    }
    if (!title) {
      pushToast({ type: "error", title: "Informe o titulo da proposta" });
      return;
    }
    if (form.value.trim()) {
      const parsedValue = Number(form.value.replace(",", "."));
      if (Number.isNaN(parsedValue)) {
        pushToast({ type: "error", title: "Informe um valor valido" });
        return;
      }
    }

    const basePayload = buildProposalPayload(opportunity, form, opportunity.ownerName);

    try {
      if (!selectedProposal || !routeProposalId) {
        const proposalId = await createProposal({
          ...basePayload,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        actions.setProposalDraftOpportunityId(null);
        navigate(`/admin/proposals/${encodeURIComponent(proposalId)}`);
        pushToast({ type: "success", title: "Proposta criada" });
      } else {
        await updateProposal(selectedProposal.id, {
          ...basePayload,
          createdAt: selectedProposal.createdAt,
        });
        actions.setProposalDraftOpportunityId(null);
        navigate(`/admin/proposals/${encodeURIComponent(selectedProposal.id)}`);
        pushToast({ type: "success", title: "Proposta atualizada" });
      }
      setIsEditing(false);
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao salvar proposta", message: error?.message || "" });
    }
  };

  const openDerivedProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    navigate(`/admin/projects/${encodeURIComponent(projectId)}`);
  };

  const approveSelectedProposal = async () => {
    if (!selectedProposal || !profile) return;
    if (approvalIssues.length > 0) {
      pushToast({
        type: "error",
        title: "Proposta incompleta para aprovacao",
        message: approvalIssues.join(" | "),
      });
      return;
    }

    setIsApproving(true);
    try {
      const result = await approveProposalAndCreateProject({
        proposalId: selectedProposal.id,
        approverUid: profile.uid,
        approverName: profile.name,
      });
      pushToast({
        type: "success",
        title: result.alreadyExisted
          ? "Projeto derivado ja existente"
          : "Projeto criado a partir da proposta",
      });
      openDerivedProject(result.projectId);
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao aprovar proposta", message: error?.message || "" });
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 rounded-[32px] border border-[#013d23]/10 bg-white px-8 py-7 shadow-[0_28px_70px_-55px_rgba(15,23,42,0.45)]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#013d23]">Comercial</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Propostas</h1>
          <p className="mt-1 text-slate-500">Fluxo comercial consolidado entre oportunidade, proposta e projeto.</p>
        </div>
        <button
          onClick={startCreate}
          className="px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-[0.3em] bg-[#013d23] text-white shadow-[0_18px_32px_-20px_rgba(1,61,35,0.8)] hover:bg-[#02502e]"
        >
          + Nova proposta
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8">
        <div className="bg-white rounded-3xl border border-slate-200 p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black text-slate-800">Lista de propostas</h3>
            <button
              onClick={startCreate}
              className="text-[10px] font-black uppercase tracking-[0.3em] text-[#013d23]"
          >
            Nova
          </button>
          </div>

          <div className="mt-6 space-y-6 max-h-[680px] overflow-auto pr-1">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">V2</p>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  {proposals.length}
                </span>
              </div>
              {loadingProposals ? (
                <div className="py-8 text-center text-slate-300 text-sm">Carregando propostas...</div>
              ) : null}
              {!loadingProposals && proposals.length === 0 ? (
                <div className="py-8 text-center text-slate-300 text-sm">Nenhuma proposta V2 cadastrada.</div>
              ) : null}
              {proposals.map((proposal) => (
                <button
                  key={proposal.id}
                  onClick={() => {
                    setIsEditing(false);
                    navigate(`/admin/proposals/${encodeURIComponent(proposal.id)}`);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border ${
                    selectedProposal?.id === proposal.id && !isEditing
                      ? "border-[#013d23]/15 bg-[#013d23]/[0.04]"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-slate-800">{proposal.title}</p>
                      <p className="text-xs text-slate-500 mt-2">{proposal.companySnapshot.name}</p>
                    </div>
                    <Badge type="status" value={proposal.status} />
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Legado</p>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                  {legacyProposals.length}
                </span>
              </div>
              {legacyProposals.length === 0 ? (
                <div className="py-8 text-center text-slate-300 text-sm">Nenhuma proposta legada pendente.</div>
              ) : null}
              {legacyProposals.map((proposal) => (
                <button
                  key={proposal.id}
                  onClick={() => {
                    setSelectedProjectId(proposal.id);
                    setView("DETALHE_PROJETO");
                  }}
                  className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-slate-800">{proposal.name}</p>
                      <p className="text-xs text-slate-500 mt-2">{proposal.companyName}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">
                      LEGADO
                    </span>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-3">
                    {getProjectTypeLabel(proposal.projectType, proposal.projectTypeOther)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {!routeProposalId || isEditing ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    {!routeProposalId ? "Nova proposta" : "Editar proposta"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    A proposta nasce de uma oportunidade valida e pode trocar de origem enquanto ainda nao foi aprovada.
                  </p>
                </div>
                {routeProposalId ? (
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] border-2 border-slate-900 text-slate-900"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>

              {loadingOpportunities ? (
                <div className="py-10 text-center text-slate-300 text-sm">Carregando oportunidades...</div>
              ) : null}

              {!loadingOpportunities && opportunities.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-bold text-amber-900">Cadastre uma oportunidade antes de criar propostas.</p>
                  <div className="mt-4">
                    <button
                      onClick={() => navigate("/admin/opportunities")}
                      className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] bg-[#013d23] text-white shadow-[0_18px_32px_-22px_rgba(1,61,35,0.75)] hover:bg-[#02502e]"
                    >
                      Abrir oportunidades
                    </button>
                  </div>
                </div>
              ) : null}

              {!loadingOpportunities && opportunities.length > 0 ? (
                <>
                  <select
                    value={form.opportunityId}
                    onChange={(event) => {
                      const nextOpportunity =
                        opportunities.find((entry) => entry.id === event.target.value) || null;
                      actions.setProposalDraftOpportunityId(event.target.value || null);
                      setForm((current) => ({
                        ...current,
                        opportunityId: event.target.value,
                        title: nextOpportunity?.title || "",
                        value:
                          typeof nextOpportunity?.estimatedValue === "number"
                            ? String(nextOpportunity.estimatedValue)
                            : "",
                      }));
                    }}
                    className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm"
                  >
                    <option value="">Selecione uma oportunidade</option>
                    {opportunities.map((opportunity) => (
                      <option key={opportunity.id} value={opportunity.id}>
                        {opportunity.companySnapshot.name} - {opportunity.title}
                      </option>
                    ))}
                  </select>

                  {selectedOpportunity ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Origem</p>
                      <p className="text-sm font-bold text-slate-700 mt-2">
                        {selectedOpportunity.companySnapshot.name} / {selectedOpportunity.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Contato: {selectedOpportunity.contactSnapshot?.name || "Sem contato principal"} / Estagio:{" "}
                        {selectedOpportunity.stage}
                      </p>
                    </div>
                  ) : null}

                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                    className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm"
                    placeholder="Titulo da proposta"
                  />

                  <textarea
                    value={form.scopeSummary}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, scopeSummary: event.target.value }))
                    }
                    className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm min-h-[140px]"
                    placeholder="Resumo do escopo"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      value={form.value}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, value: event.target.value }))
                      }
                      className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm"
                      placeholder="Valor"
                    />
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value as ProposalStatus,
                        }))
                      }
                      className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm"
                    >
                      {editableStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => (!routeProposalId ? startCreate(null) : cancelEdit())}
                      className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] border-2 border-slate-900 text-slate-900"
                    >
                      Limpar
                    </button>
                    <button
                      onClick={submitForm}
                      className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] bg-[#013d23] text-white shadow-[0_18px_32px_-22px_rgba(1,61,35,0.75)] hover:bg-[#02502e]"
                    >
                      Salvar proposta
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {routeProposalId && !isEditing && selectedProposal ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Proposta V2</p>
                  <h2 className="text-2xl font-black text-slate-900 mt-2">{selectedProposal.title}</h2>
                  <p className="text-sm text-slate-500 mt-2">
                    {selectedProposal.companySnapshot.name} / {selectedProposal.opportunitySnapshot.title}
                  </p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {selectedProposal.projectId || selectedProposal.sourceProjectId ? (
                    <button
                      onClick={() =>
                        openDerivedProject(selectedProposal.projectId || selectedProposal.sourceProjectId || "")
                      }
                      className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] bg-[#013d23] text-white shadow-[0_18px_32px_-22px_rgba(1,61,35,0.75)] hover:bg-[#02502e]"
                    >
                      Abrir projeto
                    </button>
                  ) : null}
                  <button
                    onClick={() =>
                      navigate(`/admin/opportunities/${encodeURIComponent(selectedProposal.opportunityId)}`)
                    }
                    className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] border-2 border-slate-900 text-slate-900"
                  >
                    Abrir oportunidade
                  </button>
                  {!selectedProposal.projectId && selectedProposal.status !== "APROVADA" ? (
                    <button
                      onClick={approveSelectedProposal}
                      disabled={isApproving}
                      className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] bg-[#013d23] text-white disabled:opacity-60"
                    >
                      {isApproving ? "Aprovando..." : "Aprovar proposta"}
                    </button>
                  ) : null}
                  {!selectedProposal.projectId && selectedProposal.status !== "APROVADA" ? (
                    <button
                      onClick={startEdit}
                      className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] bg-[#013d23] text-white shadow-[0_18px_32px_-22px_rgba(1,61,35,0.75)] hover:bg-[#02502e]"
                    >
                      Editar
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Status</p>
                  <div className="mt-2">
                    <Badge type="status" value={selectedProposal.status} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Valor</p>
                  <p className="text-sm font-bold text-slate-700 mt-2">{formatCurrency(selectedProposal.value)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Responsavel</p>
                  <p className="text-sm font-bold text-slate-700 mt-2">
                    {selectedProposal.ownerName || "Nao informado"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Criada em</p>
                  <p className="text-sm font-bold text-slate-700 mt-2">
                    {formatDateTime(selectedProposal.createdAt)}
                  </p>
                </div>
              </div>

              {selectedProposal.status !== "APROVADA" ? (
                <div
                  className={`rounded-2xl border p-4 ${
                    approvalIssues.length === 0
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                    Pronto para virar projeto
                  </p>
                  {approvalIssues.length === 0 ? (
                    <p className="mt-2 text-sm font-bold text-emerald-800">
                      Esta proposta pode ser aprovada e gerar um projeto automaticamente.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-1 text-sm text-amber-900">
                      {approvalIssues.map((issue) => (
                        <p key={issue}>- {issue}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {(selectedProposal.approvedAt || selectedProposal.projectId || selectedProposal.sourceProjectId) ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Projeto gerado</p>
                    <p className="text-sm font-bold text-slate-700 mt-2">
                      {selectedProposal.projectId || selectedProposal.sourceProjectId || "Nao informado"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Aprovada em</p>
                    <p className="text-sm font-bold text-slate-700 mt-2">
                      {formatDateTime(selectedProposal.approvedAt)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Aprovada por</p>
                    <p className="text-sm font-bold text-slate-700 mt-2">
                      {selectedProposal.approvedByName || "Nao informado"}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Empresa</p>
                  <p className="text-sm font-bold text-slate-700 mt-2">{selectedProposal.companySnapshot.name}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Contato</p>
                  <p className="text-sm font-bold text-slate-700 mt-2">
                    {selectedProposal.opportunitySnapshot.contactName || "Nao informado"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Escopo</p>
                <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">
                  {selectedProposal.scopeSummary || "Escopo nao informado."}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
