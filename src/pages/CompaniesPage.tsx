import React, { useEffect, useMemo, useState } from "react";
import { Company, Project } from "../types";
import { createCompany, softDeleteCompany, updateCompany } from "../services/companies";
import { ToastType } from "../hooks/useToasts";

type ToastPayload = { type: ToastType; title: string; message?: string };

interface CompaniesPageProps {
  companies: Company[];
  projects: Project[];
  currentUserUid: string;
  loading: boolean;
  onOpenProject: (projectId: string) => void;
  pushToast: (payload: ToastPayload) => void;
}

const emptyForm = {
  name: "",
  cnpj: "",
  email: "",
  phone: "",
  notes: "",
};

function sanitize(value: string) {
  return (value || "").trim().replace(/\s+/g, " ");
}

export default function CompaniesPage({
  companies,
  projects,
  currentUserUid,
  loading,
  onOpenProject,
  pushToast,
}: CompaniesPageProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].id);
    }
    if (selectedCompanyId && !companies.find((c) => c.id === selectedCompanyId)) {
      setSelectedCompanyId(companies[0]?.id ?? null);
    }
  }, [companies, selectedCompanyId]);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const selectedCompanyProjects = useMemo(() => {
    if (!selectedCompany) return [];
    return projects.filter((p) => p.companyId === selectedCompany.id);
  }, [projects, selectedCompany]);

  const startCreate = () => {
    setForm(emptyForm);
    setFormMode("create");
  };

  const startEdit = () => {
    if (!selectedCompany) return;
    setForm({
      name: selectedCompany.name,
      cnpj: selectedCompany.cnpj || "",
      email: selectedCompany.email || "",
      phone: selectedCompany.phone || "",
      notes: selectedCompany.notes || "",
    });
    setFormMode("edit");
  };

  const cancelForm = () => {
    setFormMode(null);
    setForm(emptyForm);
  };

  const submitForm = async () => {
    const name = sanitize(form.name);
    if (!name) {
      pushToast({ type: "error", title: "Informe o nome da empresa" });
      return;
    }

    const payload: Omit<Company, "id" | "createdAt" | "createdByUid"> = {
      name,
      ...(sanitize(form.cnpj) ? { cnpj: sanitize(form.cnpj) } : {}),
      ...(sanitize(form.email) ? { email: sanitize(form.email) } : {}),
      ...(sanitize(form.phone) ? { phone: sanitize(form.phone) } : {}),
      ...(form.notes?.trim() ? { notes: form.notes.trim() } : {}),
    };

    try {
      if (formMode === "create") {
        const newId = await createCompany({
          ...payload,
          createdAt: Date.now(),
          createdByUid: currentUserUid,
        });
        // Mantemos a empresa recém-criada em foco para facilitar o fluxo.
        setSelectedCompanyId(newId);
        pushToast({ type: "success", title: "Empresa criada" });
      } else if (formMode === "edit" && selectedCompany) {
        await updateCompany(selectedCompany.id, payload);
        pushToast({ type: "success", title: "Empresa atualizada" });
      }
      cancelForm();
    } catch (error: any) {
      pushToast({
        type: "error",
        title: "Erro ao salvar empresa",
        message: error?.message || "",
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedCompany) return;
    const projectsCount = selectedCompanyProjects.length;
    const confirmMessage =
      projectsCount > 0
        ? `Excluir a empresa "${selectedCompany.name}"? Existem ${projectsCount} projeto(s) vinculados.`
        : `Excluir a empresa "${selectedCompany.name}"?`;
    if (!confirm(confirmMessage)) return;

    try {
      // Soft delete para manter histórico e evitar impactos em projetos existentes.
      await softDeleteCompany(selectedCompany.id);
      pushToast({ type: "success", title: "Empresa removida" });
      setSelectedCompanyId(null);
    } catch (error: any) {
      pushToast({
        type: "error",
        title: "Erro ao remover empresa",
        message: error?.message || "",
      });
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white px-8 py-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-200">Empresas</p>
          <h1 className="text-3xl font-black mt-2">Empresas</h1>
          <p className="text-slate-200 mt-1">Base de clientes e projetos vinculados.</p>
        </div>
        <button
          onClick={startCreate}
          className="px-6 py-3 rounded-2xl font-bold transition-all text-xs uppercase tracking-[0.3em] shadow-sm hover:shadow-md bg-gradient-to-r from-slate-900 via-blue-900 to-blue-600 text-white"
        >
          + Nova empresa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_22px_45px_-35px_rgba(15,23,42,0.45)] p-6">
          <h3 className="text-lg font-black text-slate-800">Lista de empresas</h3>
          <p className="text-xs text-slate-400 mt-1">Selecione para ver detalhes.</p>

          <div className="mt-6 space-y-3 max-h-[520px] overflow-auto pr-1">
            {loading ? (
              <div className="py-10 text-center text-slate-300 text-sm">Carregando empresas...</div>
            ) : null}
            {!loading && companies.length === 0 ? (
              <div className="py-10 text-center text-slate-300 text-sm">Nenhuma empresa cadastrada.</div>
            ) : null}
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => {
                  setSelectedCompanyId(company.id);
                  setFormMode(null);
                }}
                className={`w-full text-left p-4 rounded-2xl border transition ${
                  selectedCompanyId === company.id
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <p className="font-black text-slate-800">{company.name}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">
                  {projects.filter((p) => p.companyId === company.id).length} projetos
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {formMode ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_22px_45px_-35px_rgba(15,23,42,0.45)] p-8">
              <h3 className="text-xl font-black text-slate-800">
                {formMode === "create" ? "Nova empresa" : "Editar empresa"}
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Preencha os dados essenciais para vincular projetos.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="md:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Nome</p>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner"
                    placeholder="Nome da empresa"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">CNPJ</p>
                  <input
                    value={form.cnpj}
                    onChange={(e) => setForm((prev) => ({ ...prev, cnpj: e.target.value }))}
                    className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Telefone</p>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner"
                    placeholder="+55 (11) 99999-9999"
                  />
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">E-mail</p>
                  <input
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner"
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Observações</p>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner min-h-[120px]"
                    placeholder="Notas internas, segmentos, SLA..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button
                  onClick={cancelForm}
                  className="px-6 py-3 rounded-2xl font-bold transition-all text-xs uppercase tracking-[0.3em] shadow-sm hover:shadow-md border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitForm}
                  className="px-6 py-3 rounded-2xl font-bold transition-all text-xs uppercase tracking-[0.3em] shadow-sm hover:shadow-md bg-gradient-to-r from-slate-900 via-blue-900 to-blue-600 text-white"
                >
                  Salvar
                </button>
              </div>
            </div>
          ) : null}

          {!formMode && !selectedCompany ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_22px_45px_-35px_rgba(15,23,42,0.45)] p-10 text-center text-slate-400">
              Selecione uma empresa à esquerda para visualizar os detalhes.
            </div>
          ) : null}

          {!formMode && selectedCompany ? (
            <>
              <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_22px_45px_-35px_rgba(15,23,42,0.45)] p-8">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Empresa</p>
                    <h2 className="text-2xl font-black text-slate-900 mt-2">{selectedCompany.name}</h2>
                    <p className="text-sm text-slate-500 mt-2">
                      {selectedCompany.email || "Email não informado"} •{" "}
                      {selectedCompany.phone || "Telefone não informado"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={startEdit}
                      className="px-4 py-2 rounded-2xl font-bold transition-all text-xs uppercase tracking-[0.3em] shadow-sm hover:shadow-md border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={confirmDelete}
                      className="px-4 py-2 rounded-2xl font-bold transition-all text-xs uppercase tracking-[0.3em] shadow-sm hover:shadow-md bg-red-600 hover:bg-red-700 text-white"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">CNPJ</p>
                    <p className="text-sm font-bold text-slate-700 mt-2">
                      {selectedCompany.cnpj || "Não informado"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Projetos ativos</p>
                    <p className="text-sm font-bold text-slate-700 mt-2">
                      {selectedCompanyProjects.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Contato</p>
                    <p className="text-sm font-bold text-slate-700 mt-2">
                      {selectedCompany.email || "Sem e-mail"}
                    </p>
                  </div>
                </div>

                {selectedCompany.notes ? (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Notas</p>
                    <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{selectedCompany.notes}</p>
                  </div>
                ) : null}
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-[0_22px_45px_-35px_rgba(15,23,42,0.45)] p-8">
                <h3 className="text-xl font-black text-slate-800">Projetos desta empresa</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Clique em um projeto para abrir o detalhe completo.
                </p>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCompanyProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => onOpenProject(project.id)}
                      className="text-left rounded-2xl border border-slate-200 bg-slate-50/60 p-5 hover:bg-slate-50 transition"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-700">
                        {project.companyName}
                      </p>
                      <h4 className="text-lg font-black text-slate-900 mt-2">{project.name}</h4>
                      {project.description ? (
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                          {project.description}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400 mt-2">Sem descrição.</p>
                      )}
                    </button>
                  ))}
                </div>

                {selectedCompanyProjects.length === 0 ? (
                  <div className="py-10 text-center text-slate-300 text-sm">
                    Nenhum projeto vinculado.
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}