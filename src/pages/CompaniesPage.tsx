import React, { useEffect, useMemo, useState } from "react";
import { useAppRouter } from "../app/router/RouterProvider";
import { useResolvedAppRoute } from "../app/router/useResolvedAppRoute";
import { usePortalStore } from "../hooks/usePortalStore";
import { useCompaniesState, useProjectsState } from "../hooks/usePortalCollections";
import { useCompanyContacts } from "../hooks/crm/useCompanyContacts";
import { useOpportunities } from "../hooks/crm/useOpportunities";
import {
  createCompany,
  createCompanyContact,
  getNextCompanyNumber,
  softDeleteCompany,
  updateCompany,
  updateCompanyContact,
} from "../services/companies";
import { Company, CompanyContact } from "../types";
import { sanitize } from "../utils/sanitize";
import { formatCurrency } from "../utils/formatters";

const emptyCompanyForm = { name: "", cnpj: "", email: "", phone: "", notes: "" };
const emptyContactForm = { name: "", role: "", email: "", phone: "", isPrimary: false, status: "ACTIVE" as const };

export default function CompaniesPage() {
  const { profile, pushToast, setView } = usePortalStore();
  const { companies, loadingCompanies } = useCompaniesState();
  const { projects, setSelectedProjectId } = useProjectsState();
  const route = useResolvedAppRoute();
  const { navigate } = useAppRouter();
  const routeCompanyId = route.view === "EMPRESAS" ? route.params.companyId || null : null;
  const routeContactId = route.view === "EMPRESAS" ? route.params.contactId || null : null;
  const [fallbackCompanyId, setFallbackCompanyId] = useState<string | null>(null);
  const [companyMode, setCompanyMode] = useState<"create" | "edit" | null>(null);
  const [contactMode, setContactMode] = useState<"create" | "edit" | null>(null);
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [contactForm, setContactForm] = useState(emptyContactForm);

  const onContactsError = React.useCallback(
    (message: string) => pushToast({ type: "error", title: "Erro ao carregar contatos", message }),
    [pushToast]
  );
  const onOpportunitiesError = React.useCallback(
    (message: string) => pushToast({ type: "error", title: "Erro ao carregar oportunidades", message }),
    [pushToast]
  );

  useEffect(() => {
    if (routeCompanyId && companies.some((company) => company.id === routeCompanyId)) {
      setFallbackCompanyId(routeCompanyId);
    }
  }, [routeCompanyId, companies]);

  useEffect(() => {
    if (!routeCompanyId && !fallbackCompanyId && companies.length > 0) {
      setFallbackCompanyId(companies[0].id);
    }
    if (fallbackCompanyId && !companies.find((company) => company.id === fallbackCompanyId)) {
      setFallbackCompanyId(companies[0]?.id ?? null);
    }
  }, [routeCompanyId, fallbackCompanyId, companies]);

  useEffect(() => {
    if (routeCompanyId && !loadingCompanies && !companies.find((company) => company.id === routeCompanyId)) {
      navigate("/admin/companies", { replace: true });
    }
  }, [routeCompanyId, loadingCompanies, companies, navigate]);

  const selectedCompanyId = routeCompanyId || fallbackCompanyId;
  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );
  const selectedProjects = useMemo(
    () =>
      selectedCompany
        ? projects.filter(
            (project) =>
              project.companyId === selectedCompany.id &&
              project.status !== "PROPOSTA" &&
              project.status !== "RECUSADA"
          )
        : [],
    [projects, selectedCompany]
  );
  const { contacts, loadingContacts } = useCompanyContacts({ companyId: selectedCompanyId, onError: onContactsError });
  const { opportunities, loadingOpportunities } = useOpportunities({
    companyId: selectedCompanyId,
    onError: onOpportunitiesError,
  });
  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.id === routeContactId) || null,
    [contacts, routeContactId]
  );

  useEffect(() => {
    if (routeContactId && !loadingContacts && !selectedContact && selectedCompanyId) {
      navigate(`/admin/companies/${encodeURIComponent(selectedCompanyId)}`, { replace: true });
    }
  }, [routeContactId, loadingContacts, selectedContact, selectedCompanyId, navigate]);

  const openCompany = (companyId: string) => {
    setFallbackCompanyId(companyId);
    setCompanyMode(null);
    setContactMode(null);
    navigate(`/admin/companies/${encodeURIComponent(companyId)}`);
  };

  const submitCompany = async () => {
    const name = sanitize(companyForm.name);
    if (!name) {
      pushToast({ type: "error", title: "Informe o nome da empresa" });
      return;
    }

    const payload: Omit<Company, "id" | "createdAt" | "createdByUid"> = {
      name,
      ...(sanitize(companyForm.cnpj) ? { cnpj: sanitize(companyForm.cnpj) } : {}),
      ...(sanitize(companyForm.email) ? { email: sanitize(companyForm.email) } : {}),
      ...(sanitize(companyForm.phone) ? { phone: sanitize(companyForm.phone) } : {}),
      ...(companyForm.notes.trim() ? { notes: companyForm.notes.trim() } : {}),
    };

    try {
      if (companyMode === "create") {
        const companyId = await createCompany({
          ...payload,
          companyNumber: await getNextCompanyNumber(),
          createdAt: Date.now(),
          createdByUid: profile?.uid || "",
        });
        setFallbackCompanyId(companyId);
        navigate(`/admin/companies/${encodeURIComponent(companyId)}`);
        pushToast({ type: "success", title: "Empresa criada" });
      } else if (companyMode === "edit" && selectedCompany) {
        const nextCompanyNumber = selectedCompany.companyNumber ? null : await getNextCompanyNumber();
        await updateCompany(selectedCompany.id, {
          ...payload,
          ...(nextCompanyNumber ? { companyNumber: nextCompanyNumber } : {}),
        });
        pushToast({ type: "success", title: "Empresa atualizada" });
      }

      setCompanyMode(null);
      setCompanyForm(emptyCompanyForm);
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao salvar empresa", message: error?.message || "" });
    }
  };

  const removeCompany = async () => {
    if (!selectedCompany) return;
    const confirmMessage = selectedProjects.length
      ? `Excluir a empresa "${selectedCompany.name}"? Existem ${selectedProjects.length} projeto(s) vinculados.`
      : `Excluir a empresa "${selectedCompany.name}"?`;
    if (!confirm(confirmMessage)) return;

    try {
      await softDeleteCompany(selectedCompany.id);
      setFallbackCompanyId(null);
      navigate("/admin/companies", { replace: true });
      pushToast({ type: "success", title: "Empresa removida" });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao remover empresa", message: error?.message || "" });
    }
  };

  const editCompany = () => {
    if (!selectedCompany) return;
    setCompanyForm({
      name: selectedCompany.name,
      cnpj: selectedCompany.cnpj || "",
      email: selectedCompany.email || "",
      phone: selectedCompany.phone || "",
      notes: selectedCompany.notes || "",
    });
    setCompanyMode("edit");
  };

  const startCreateContact = () => {
    if (selectedCompanyId) {
      navigate(`/admin/companies/${encodeURIComponent(selectedCompanyId)}`);
    }
    setContactForm({ ...emptyContactForm, isPrimary: contacts.length === 0 });
    setContactMode("create");
  };

  const editContact = (contact: CompanyContact) => {
    if (!selectedCompanyId) return;
    setContactForm({
      name: contact.name,
      role: contact.role || "",
      email: contact.email || "",
      phone: contact.phone || "",
      isPrimary: contact.isPrimary,
      status: contact.status,
    });
    setContactMode("edit");
    navigate(`/admin/companies/${encodeURIComponent(selectedCompanyId)}/contacts/${encodeURIComponent(contact.id)}`);
  };

  const cancelContact = () => {
    setContactMode(null);
    setContactForm(emptyContactForm);
    if (selectedCompanyId) {
      navigate(`/admin/companies/${encodeURIComponent(selectedCompanyId)}`);
    }
  };

  const submitContact = async () => {
    if (!selectedCompanyId) return;

    const name = sanitize(contactForm.name);
    if (!name) {
      pushToast({ type: "error", title: "Informe o nome do contato" });
      return;
    }

    const payload: Omit<CompanyContact, "id"> = {
      name,
      ...(sanitize(contactForm.role) ? { role: sanitize(contactForm.role) } : {}),
      ...(sanitize(contactForm.email) ? { email: sanitize(contactForm.email) } : {}),
      ...(sanitize(contactForm.phone) ? { phone: sanitize(contactForm.phone) } : {}),
      isPrimary: contactForm.isPrimary,
      status: contactForm.status,
      createdAt: contactMode === "edit" ? selectedContact?.createdAt || Date.now() : Date.now(),
      updatedAt: Date.now(),
      createdByUid: contactMode === "edit" ? selectedContact?.createdByUid || profile?.uid || "" : profile?.uid || "",
    };

    try {
      if (contactMode === "create") {
        const contactId = await createCompanyContact(selectedCompanyId, payload);
        navigate(`/admin/companies/${encodeURIComponent(selectedCompanyId)}/contacts/${encodeURIComponent(contactId)}`);
        pushToast({ type: "success", title: "Contato criado" });
      } else if (contactMode === "edit" && selectedContact) {
        await updateCompanyContact(selectedCompanyId, selectedContact.id, {
          name: payload.name,
          role: payload.role,
          email: payload.email,
          phone: payload.phone,
          isPrimary: payload.isPrimary,
          status: payload.status,
        });
        pushToast({ type: "success", title: "Contato atualizado" });
      }

      setContactMode(null);
      setContactForm(emptyContactForm);
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao salvar contato", message: error?.message || "" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 rounded-[32px] border border-[#013d23]/10 bg-white px-8 py-7 shadow-[0_28px_70px_-55px_rgba(15,23,42,0.45)]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#013d23]">Comercial</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Empresas e contatos</h1>
          <p className="mt-1 text-slate-500">Base de relacionamento para oportunidades, propostas e projetos.</p>
        </div>
        <button
          onClick={() => {
            setCompanyMode("create");
            setCompanyForm(emptyCompanyForm);
          }}
          className="px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-[0.3em] bg-[#013d23] text-white shadow-[0_18px_32px_-20px_rgba(1,61,35,0.8)] hover:bg-[#02502e]"
        >
          + Nova empresa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        <div className="bg-white rounded-3xl border border-slate-200 p-6">
          <h3 className="text-lg font-black text-slate-800">Lista de empresas</h3>
          <div className="mt-6 space-y-3 max-h-[560px] overflow-auto pr-1">
            {loadingCompanies ? <div className="py-10 text-center text-slate-300 text-sm">Carregando empresas...</div> : null}
            {!loadingCompanies && companies.length === 0 ? <div className="py-10 text-center text-slate-300 text-sm">Nenhuma empresa cadastrada.</div> : null}
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => openCompany(company.id)}
                className={`w-full text-left p-4 rounded-2xl border ${selectedCompanyId === company.id ? "border-[#013d23]/15 bg-[#013d23]/[0.04]" : "border-slate-200 hover:bg-slate-50"}`}
              >
                <p className="font-black text-slate-800">{company.name}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">{projects.filter((project) => project.companyId === company.id && project.status !== "PROPOSTA" && project.status !== "RECUSADA").length} projetos</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {companyMode ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
              <h3 className="text-xl font-black text-slate-800">{companyMode === "create" ? "Nova empresa" : "Editar empresa"}</h3>
              <input value={companyForm.name} onChange={(event) => setCompanyForm((current) => ({ ...current, name: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm" placeholder="Nome da empresa" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={companyForm.cnpj} onChange={(event) => setCompanyForm((current) => ({ ...current, cnpj: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm" placeholder="CNPJ" />
                <input value={companyForm.phone} onChange={(event) => setCompanyForm((current) => ({ ...current, phone: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm" placeholder="Telefone" />
              </div>
              <input value={companyForm.email} onChange={(event) => setCompanyForm((current) => ({ ...current, email: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm" placeholder="Email" />
              <textarea value={companyForm.notes} onChange={(event) => setCompanyForm((current) => ({ ...current, notes: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm min-h-[120px]" placeholder="Observacoes" />
              <div className="flex justify-end gap-3">
                <button onClick={() => { setCompanyMode(null); setCompanyForm(emptyCompanyForm); }} className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] border-2 border-slate-900 text-slate-900">Cancelar</button>
                <button onClick={submitCompany} className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] bg-[#013d23] text-white shadow-[0_18px_32px_-22px_rgba(1,61,35,0.75)] hover:bg-[#02502e]">Salvar</button>
              </div>
            </div>
          ) : null}

          {!companyMode && !selectedCompany ? <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400">Selecione uma empresa a esquerda para visualizar os detalhes.</div> : null}

          {!companyMode && selectedCompany ? (
            <>
              <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6">
                <div className="flex items-start justify-between gap-6 flex-wrap">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Empresa</p>
                    <h2 className="text-2xl font-black text-slate-900 mt-2">{selectedCompany.name}</h2>
                    <p className="text-sm text-slate-500 mt-2">{selectedCompany.email || "Email nao informado"} / {selectedCompany.phone || "Telefone nao informado"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => navigate("/admin/opportunities")} className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] bg-[#013d23] text-white shadow-[0_18px_32px_-22px_rgba(1,61,35,0.75)] hover:bg-[#02502e]">Oportunidades</button>
                    <button onClick={editCompany} className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] border-2 border-slate-900 text-slate-900">Editar</button>
                    <button onClick={removeCompany} className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] bg-red-600 text-white">Excluir</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">CNPJ</p><p className="text-sm font-bold text-slate-700 mt-2">{selectedCompany.cnpj || "Nao informado"}</p></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Projetos</p><p className="text-sm font-bold text-slate-700 mt-2">{selectedProjects.length}</p></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Contatos</p><p className="text-sm font-bold text-slate-700 mt-2">{contacts.length}</p></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Oportunidades</p><p className="text-sm font-bold text-slate-700 mt-2">{opportunities.length}</p></div>
                </div>
                {selectedCompany.notes ? <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Notas</p><p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{selectedCompany.notes}</p></div> : null}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div><h3 className="text-xl font-black text-slate-800">Contatos</h3><p className="text-sm text-slate-500 mt-1">Pessoas-chave da empresa selecionada.</p></div>
                    <button onClick={startCreateContact} className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] bg-[#013d23] text-white shadow-[0_18px_32px_-22px_rgba(1,61,35,0.75)] hover:bg-[#02502e]">+ Novo contato</button>
                  </div>
                  <div className="space-y-3">
                    {loadingContacts ? <div className="py-8 text-center text-slate-300 text-sm">Carregando contatos...</div> : null}
                    {!loadingContacts && contacts.length === 0 ? <div className="py-8 text-center text-slate-300 text-sm">Nenhum contato cadastrado.</div> : null}
                    {contacts.map((contact) => (
                      <button key={contact.id} onClick={() => navigate(`/admin/companies/${encodeURIComponent(selectedCompany.id)}/contacts/${encodeURIComponent(contact.id)}`)} className={`w-full text-left rounded-2xl border p-4 ${selectedContact?.id === contact.id ? "border-[#013d23]/15 bg-[#013d23]/[0.04]" : "border-slate-200 hover:bg-slate-50"}`}>
                        <div className="flex items-start justify-between gap-4"><div><p className="font-black text-slate-800">{contact.name}</p><p className="text-xs text-slate-500 mt-1">{contact.role || "Sem cargo"} / {contact.email || "Sem email"}</p></div><div className="text-right">{contact.isPrimary ? <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#013d23]">Principal</p> : null}<p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">{contact.status}</p></div></div>
                      </button>
                    ))}
                  </div>

                  {contactMode ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
                      <h4 className="text-lg font-black text-slate-800">{contactMode === "create" ? "Novo contato" : "Editar contato"}</h4>
                      <input value={contactForm.name} onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm" placeholder="Nome do contato" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input value={contactForm.role} onChange={(event) => setContactForm((current) => ({ ...current, role: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm" placeholder="Cargo" />
                        <input value={contactForm.phone} onChange={(event) => setContactForm((current) => ({ ...current, phone: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm" placeholder="Telefone" />
                      </div>
                      <input value={contactForm.email} onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm" placeholder="Email" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select value={contactForm.status} onChange={(event) => setContactForm((current) => ({ ...current, status: event.target.value as CompanyContact["status"] }))} className="w-full px-5 py-4 border border-gray-100 rounded-2xl text-sm"><option value="ACTIVE">Ativo</option><option value="INACTIVE">Inativo</option></select>
                        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"><input type="checkbox" checked={contactForm.isPrimary} onChange={(event) => setContactForm((current) => ({ ...current, isPrimary: event.target.checked }))} /><span className="text-sm font-bold text-slate-700">Contato principal</span></label>
                      </div>
                      <div className="flex justify-end gap-3">
                        <button onClick={cancelContact} className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] border-2 border-slate-900 text-slate-900">Cancelar</button>
                        <button onClick={submitContact} className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] bg-[#013d23] text-white shadow-[0_18px_32px_-22px_rgba(1,61,35,0.75)] hover:bg-[#02502e]">Salvar contato</button>
                      </div>
                    </div>
                  ) : selectedContact ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap"><div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Contato selecionado</p><h4 className="text-lg font-black text-slate-800 mt-2">{selectedContact.name}</h4><p className="text-sm text-slate-500 mt-2">{selectedContact.role || "Sem cargo"} / {selectedContact.phone || "Sem telefone"}</p></div><button onClick={() => editContact(selectedContact)} className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] border-2 border-slate-900 text-slate-900">Editar</button></div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-3xl border border-slate-200 p-8">
                    <div className="flex items-center justify-between gap-4 flex-wrap"><div><h3 className="text-xl font-black text-slate-800">Oportunidades</h3><p className="text-sm text-slate-500 mt-1">Historico comercial basico desta empresa.</p></div><button onClick={() => navigate("/admin/opportunities")} className="px-4 py-2 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] bg-[#013d23] text-white shadow-[0_18px_32px_-22px_rgba(1,61,35,0.75)] hover:bg-[#02502e]">Abrir CRM</button></div>
                    <div className="mt-6 space-y-3">
                      {loadingOpportunities ? <div className="py-8 text-center text-slate-300 text-sm">Carregando oportunidades...</div> : null}
                      {!loadingOpportunities && opportunities.length === 0 ? <div className="py-8 text-center text-slate-300 text-sm">Nenhuma oportunidade registrada.</div> : null}
                      {opportunities.slice(0, 6).map((opportunity) => (
                        <button key={opportunity.id} onClick={() => navigate(`/admin/opportunities/${encodeURIComponent(opportunity.id)}`)} className="w-full text-left rounded-2xl border border-slate-200 bg-slate-50/70 p-4 hover:bg-slate-50">
                          <div className="flex items-start justify-between gap-4"><div><p className="font-black text-slate-800">{opportunity.title}</p><p className="text-xs text-slate-500 mt-2">{opportunity.contactSnapshot?.name || "Sem contato principal"} / {formatCurrency(opportunity.estimatedValue)}</p></div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#013d23]">{opportunity.stage}</p></div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 p-8">
                    <h3 className="text-xl font-black text-slate-800">Projetos desta empresa</h3>
                    <div className="mt-6 grid grid-cols-1 gap-4">
                      {selectedProjects.map((project) => (
                        <button key={project.id} onClick={() => { setSelectedProjectId(project.id); setView("DETALHE_PROJETO"); }} className="text-left rounded-2xl border border-slate-200 bg-slate-50/60 p-5 hover:bg-slate-50">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#013d23]">{project.companyName}</p>
                          <h4 className="text-lg font-black text-slate-900 mt-2">{project.name}</h4>
                          <p className="text-sm text-slate-500 mt-2 line-clamp-2">{project.description || "Sem descricao."}</p>
                        </button>
                      ))}
                    </div>
                    {selectedProjects.length === 0 ? <div className="py-10 text-center text-slate-300 text-sm">Nenhum projeto vinculado.</div> : null}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
