import React, { useEffect, useMemo, useState } from "react";
import { useAppRouter } from "../app/router/RouterProvider";
import { useResolvedAppRoute } from "../app/router/useResolvedAppRoute";
import { usePortalStore } from "../hooks/usePortalStore";
import { useCompaniesState, useUsersState } from "../hooks/usePortalCollections";
import { useCompanyContacts } from "../hooks/crm/useCompanyContacts";
import { useOpportunities } from "../hooks/crm/useOpportunities";
import { useProposals } from "../hooks/crm/useProposals";
import { createOpportunity, updateOpportunity } from "../services/opportunities";
import { Opportunity, OpportunityStage, UserProfile } from "../types";
import { sanitize } from "../utils/sanitize";
import { formatCurrency } from "../utils/formatters";
import Badge from "../components/common/Badge";

const emptyForm = {
  companyId: "",
  primaryContactId: "",
  title: "",
  description: "",
  serviceType: "",
  stage: "NOVA" as OpportunityStage,
  source: "",
  estimatedValue: "",
  ownerUid: "",
  expectedCloseAt: "",
  notes: "",
};

const stages: OpportunityStage[] = ["NOVA", "QUALIFICACAO", "DIAGNOSTICO", "PROPOSTA", "NEGOCIACAO", "GANHA", "PERDIDA"];

function getOwners(users: UserProfile[]) {
  return users.filter((user) => user.role === "ADMIN" && user.active && user.status === "ACTIVE");
}

export default function OpportunitiesPage() {
  const { profile, pushToast, actions } = usePortalStore();
  const { companies } = useCompaniesState();
  const { users } = useUsersState();
  const route = useResolvedAppRoute();
  const { navigate } = useAppRouter();
  const [fallbackOpportunityId, setFallbackOpportunityId] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState({ ...emptyForm, ownerUid: profile?.uid || "" });
  const onOpportunitiesError = React.useCallback(
    (message: string) => pushToast({ type: "error", title: "Erro ao carregar oportunidades", message }),
    [pushToast]
  );
  const onContactsError = React.useCallback(
    (message: string) => pushToast({ type: "error", title: "Erro ao carregar contatos", message }),
    [pushToast]
  );
  const onProposalsError = React.useCallback(
    (message: string) => pushToast({ type: "error", title: "Erro ao carregar propostas vinculadas", message }),
    [pushToast]
  );
  const { opportunities, loadingOpportunities } = useOpportunities({ onError: onOpportunitiesError });
  const routeOpportunityId = route.view === "OPORTUNIDADES" ? route.params.opportunityId || null : null;

  useEffect(() => {
    if (routeOpportunityId && opportunities.some((opportunity) => opportunity.id === routeOpportunityId)) {
      setFallbackOpportunityId(routeOpportunityId);
    }
  }, [routeOpportunityId, opportunities]);

  useEffect(() => {
    if (!routeOpportunityId && !fallbackOpportunityId && opportunities.length > 0) {
      setFallbackOpportunityId(opportunities[0].id);
    }
    if (fallbackOpportunityId && !opportunities.find((opportunity) => opportunity.id === fallbackOpportunityId)) {
      setFallbackOpportunityId(opportunities[0]?.id ?? null);
    }
  }, [routeOpportunityId, fallbackOpportunityId, opportunities]);

  const selectedOpportunityId = routeOpportunityId || fallbackOpportunityId;
  const selectedOpportunity = useMemo(
    () => opportunities.find((opportunity) => opportunity.id === selectedOpportunityId) || null,
    [opportunities, selectedOpportunityId]
  );
  useEffect(() => {
    if (routeOpportunityId && !loadingOpportunities && !selectedOpportunity) {
      navigate("/admin/opportunities", { replace: true });
    }
  }, [routeOpportunityId, loadingOpportunities, selectedOpportunity, navigate]);

  const owners = useMemo(() => getOwners(users), [users]);
  const { contacts, loadingContacts } = useCompanyContacts({
    companyId: form.companyId || null,
    onError: onContactsError,
  });
  const { proposals: linkedProposals, loadingProposals } = useProposals({
    opportunityId: selectedOpportunityId,
    onError: onProposalsError,
  });

  const openProposalDraft = (opportunityId: string) => {
    actions.setProposalDraftOpportunityId(opportunityId);
    navigate("/admin/proposals");
  };

  const startCreate = () => {
    setFallbackOpportunityId(null);
    setMode("create");
    setForm({ ...emptyForm, companyId: companies[0]?.id || "", ownerUid: profile?.uid || "" });
    navigate("/admin/opportunities");
  };

  const startEdit = () => {
    if (!selectedOpportunity) return;
    setMode("edit");
    setForm({
      companyId: selectedOpportunity.companyId,
      primaryContactId: selectedOpportunity.primaryContactId || "",
      title: selectedOpportunity.title,
      description: selectedOpportunity.description || "",
      serviceType: selectedOpportunity.serviceType || "",
      stage: selectedOpportunity.stage,
      source: selectedOpportunity.source || "",
      estimatedValue: typeof selectedOpportunity.estimatedValue === "number" ? String(selectedOpportunity.estimatedValue) : "",
      ownerUid: selectedOpportunity.ownerUid,
      expectedCloseAt: selectedOpportunity.expectedCloseAt || "",
      notes: selectedOpportunity.notes || "",
    });
  };

  const cancelForm = () => {
    const isEditMode = mode === "edit";
    setMode(null);
    setForm({ ...emptyForm, ownerUid: profile?.uid || "" });
    if (isEditMode && selectedOpportunityId) {
      navigate(`/admin/opportunities/${encodeURIComponent(selectedOpportunityId)}`);
    } else {
      navigate("/admin/opportunities");
    }
  };

  const submitForm = async () => {
    const company = companies.find((entry) => entry.id === form.companyId) || null;
    const owner = owners.find((entry) => entry.uid === form.ownerUid) || profile || null;
    const primaryContact = form.primaryContactId ? contacts.find((entry) => entry.id === form.primaryContactId) || null : null;
    const title = sanitize(form.title);

    if (!company) return pushToast({ type: "error", title: "Selecione uma empresa valida" });
    if (!title) return pushToast({ type: "error", title: "Informe o titulo da oportunidade" });
    if (!owner) return pushToast({ type: "error", title: "Selecione um responsavel" });

    const estimatedValue = form.estimatedValue.trim() ? Number(form.estimatedValue.replace(",", ".")) : undefined;
    if (typeof estimatedValue === "number" && Number.isNaN(estimatedValue)) {
      return pushToast({ type: "error", title: "Informe um valor estimado valido" });
    }

    const payload: Omit<Opportunity, "id"> = {
      companyId: company.id,
      ...(primaryContact ? { primaryContactId: primaryContact.id } : {}),
      title,
      ...(sanitize(form.description) ? { description: sanitize(form.description) } : {}),
      ...(sanitize(form.serviceType) ? { serviceType: sanitize(form.serviceType) } : {}),
      stage: form.stage,
      ...(sanitize(form.source) ? { source: sanitize(form.source) } : {}),
      ...(typeof estimatedValue === "number" ? { estimatedValue } : {}),
      ownerUid: owner.uid,
      ownerName: owner.name,
      ...(form.expectedCloseAt ? { expectedCloseAt: form.expectedCloseAt } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      companySnapshot: {
        id: company.id,
        name: company.name,
        ...(company.cnpj ? { cnpj: company.cnpj } : {}),
        ...(company.email ? { email: company.email } : {}),
        ...(company.phone ? { phone: company.phone } : {}),
      },
      ...(primaryContact
        ? {
            contactSnapshot: {
              id: primaryContact.id,
              name: primaryContact.name,
              ...(primaryContact.role ? { role: primaryContact.role } : {}),
              ...(primaryContact.email ? { email: primaryContact.email } : {}),
              ...(primaryContact.phone ? { phone: primaryContact.phone } : {}),
            },
          }
        : {}),
      createdAt: mode === "edit" ? selectedOpportunity?.createdAt || Date.now() : Date.now(),
      updatedAt: Date.now(),
    };

    try {
      if (mode === "create") {
        const opportunityId = await createOpportunity(payload);
        setFallbackOpportunityId(opportunityId);
        navigate(`/admin/opportunities/${encodeURIComponent(opportunityId)}`);
        pushToast({ type: "success", title: "Oportunidade criada" });
      } else if (mode === "edit" && selectedOpportunity) {
        await updateOpportunity(selectedOpportunity.id, payload);
        pushToast({ type: "success", title: "Oportunidade atualizada" });
      }
      setMode(null);
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao salvar oportunidade", message: error?.message || "" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 rounded-[32px] border border-[#013d23]/10 bg-white px-8 py-7 shadow-[0_28px_70px_-55px_rgba(15,23,42,0.45)]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#013d23]">Comercial</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Oportunidades</h1>
          <p className="mt-1 text-slate-500">Pipeline comercial com passagem direta para proposta.</p>
        </div>
        <button onClick={startCreate} className="px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-[0.3em] bg-[#013d23] text-white shadow-[0_18px_32px_-20px_rgba(1,61,35,0.8)] hover:bg-[#02502e]">+ Nova oportunidade</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8">
        <div className="bg-white rounded-3xl border border-slate-200 p-6">
          <h3 className="text-lg font-black text-slate-800">Pipeline</h3>
          <div className="mt-6 space-y-3 max-h-[620px] overflow-auto pr-1">
            {loadingOpportunities ? <div className="py-10 text-center text-slate-300 text-sm">Carregando oportunidades...</div> : null}
            {!loadingOpportunities && opportunities.length === 0 ? <div className="py-10 text-center text-slate-300 text-sm">Nenhuma oportunidade cadastrada.</div> : null}
            {opportunities.map((opportunity) => (
              <button key={opportunity.id} onClick={() => navigate(`/admin/opportunities/${encodeURIComponent(opportunity.id)}`)} className={`w-full text-left p-4 rounded-2xl border ${selectedOpportunity?.id === opportunity.id ? "border-[#013d23]/15 bg-[#013d23]/[0.04]" : "border-slate-200 hover:bg-slate-50"}`}>
                <div className="flex items-start justify-between gap-4"><div><p className="font-black text-slate-800">{opportunity.title}</p><p className="text-xs text-slate-500 mt-2">{opportunity.companySnapshot.name}</p></div><span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#013d23]">{opportunity.stage}</span></div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {mode ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
              <h3 className="text-xl font-black text-slate-800">{mode === "create" ? "Nova oportunidade" : "Editar oportunidade"}</h3>
              <select value={form.companyId} onChange={(event) => setForm((current) => ({ ...current, companyId: event.target.value, primaryContactId: "" }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm"><option value="">Selecione uma empresa</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>
              <select value={form.primaryContactId} onChange={(event) => setForm((current) => ({ ...current, primaryContactId: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm" disabled={!form.companyId || loadingContacts}><option value="">{loadingContacts ? "Carregando contatos..." : "Selecione um contato"}</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select>
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm" placeholder="Titulo" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={form.serviceType} onChange={(event) => setForm((current) => ({ ...current, serviceType: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm" placeholder="Tipo de servico" />
                <select value={form.stage} onChange={(event) => setForm((current) => ({ ...current, stage: event.target.value as OpportunityStage }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm">{stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}</select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm" placeholder="Origem" />
                <input value={form.estimatedValue} onChange={(event) => setForm((current) => ({ ...current, estimatedValue: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm" placeholder="Valor estimado" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select value={form.ownerUid} onChange={(event) => setForm((current) => ({ ...current, ownerUid: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm"><option value="">Selecione um responsavel</option>{owners.map((owner) => <option key={owner.uid} value={owner.uid}>{owner.name}</option>)}</select>
                <input type="date" value={form.expectedCloseAt} onChange={(event) => setForm((current) => ({ ...current, expectedCloseAt: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm" />
              </div>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm min-h-[100px]" placeholder="Descricao" />
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm min-h-[120px]" placeholder="Notas internas" />
              <div className="flex justify-end gap-3">
                <button onClick={cancelForm} className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] border-2 border-slate-900 text-slate-900">Cancelar</button>
                <button onClick={submitForm} className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] bg-[#013d23] text-white shadow-[0_18px_32px_-22px_rgba(1,61,35,0.75)] hover:bg-[#02502e]">Salvar oportunidade</button>
              </div>
            </div>
          ) : null}

          {!mode && !selectedOpportunity ? <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400">Selecione uma oportunidade a esquerda ou crie uma nova.</div> : null}

          {!mode && selectedOpportunity ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div><p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Oportunidade</p><h2 className="text-2xl font-black text-slate-900 mt-2">{selectedOpportunity.title}</h2><p className="text-sm text-slate-500 mt-2">{selectedOpportunity.companySnapshot.name} / {selectedOpportunity.contactSnapshot?.name || "Sem contato principal"}</p></div>
                <div className="flex gap-3 flex-wrap">
                  <button onClick={() => openProposalDraft(selectedOpportunity.id)} className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] bg-[#013d23] text-white shadow-[0_18px_32px_-22px_rgba(1,61,35,0.75)] hover:bg-[#02502e]">Criar proposta</button>
                  <button onClick={() => navigate("/admin/proposals")} className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] border-2 border-slate-900 text-slate-900">Abrir propostas</button>
                  <button onClick={startEdit} className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] border-2 border-slate-900 text-slate-900">Editar</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Estagio</p><div className="mt-2"><Badge type="status" value={selectedOpportunity.stage} /></div></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Valor estimado</p><p className="text-sm font-bold text-slate-700 mt-2">{formatCurrency(selectedOpportunity.estimatedValue)}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Responsavel</p><p className="text-sm font-bold text-slate-700 mt-2">{selectedOpportunity.ownerName || "Nao informado"}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Propostas</p><p className="text-sm font-bold text-slate-700 mt-2">{linkedProposals.length}</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Origem</p><p className="text-sm font-bold text-slate-700 mt-2">{selectedOpportunity.source || "Nao informada"}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Servico</p><p className="text-sm font-bold text-slate-700 mt-2">{selectedOpportunity.serviceType || "Nao informado"}</p></div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Propostas desta oportunidade</p>
                    <p className="text-sm text-slate-500 mt-1">O fluxo comercial segue daqui para proposta e projeto.</p>
                  </div>
                  <button onClick={() => openProposalDraft(selectedOpportunity.id)} className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] bg-[#013d23] text-white shadow-[0_18px_32px_-22px_rgba(1,61,35,0.75)] hover:bg-[#02502e]">Nova proposta</button>
                </div>
                <div className="mt-4 space-y-3">
                  {loadingProposals ? <div className="py-6 text-center text-slate-300 text-sm">Carregando propostas...</div> : null}
                  {!loadingProposals && linkedProposals.length === 0 ? <div className="py-6 text-center text-slate-300 text-sm">Nenhuma proposta criada para esta oportunidade.</div> : null}
                  {linkedProposals.map((proposal) => (
                    <button key={proposal.id} onClick={() => navigate(`/admin/proposals/${encodeURIComponent(proposal.id)}`)} className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black text-slate-800">{proposal.title}</p>
                          <p className="text-xs text-slate-500 mt-2">{formatCurrency(proposal.value)}</p>
                        </div>
                        <Badge type="status" value={proposal.status} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {selectedOpportunity.description ? <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Descricao</p><p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{selectedOpportunity.description}</p></div> : null}
              {selectedOpportunity.notes ? <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Notas internas</p><p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{selectedOpportunity.notes}</p></div> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
