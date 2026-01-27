import React, { createContext, useContext, useMemo } from "react";
import { usePortalStore } from "../../hooks/usePortalStore";
import Sidebar from "../../layout/Sidebar";
import Toasts from "../../components/ui/Toasts";
import Modal from "../../components/common/Modal";
import Button from "../../components/common/Button";
import { Priority, Project } from "../../types";
import { sanitize } from "../../utils/sanitize";
import { isValidDateISO } from "../../utils/dates";
import { createProject, createDelivery, getNextProposalSequence, updateProject as updateProjectSvc } from "../../services/portal";
import { createNotification } from "../../services/notifications";
import { logout as logoutSvc } from "../../services/auth";
import { getNextCompanyNumber, updateCompany } from "../../services/companies";

interface ShellActions {
  openCreateProject: () => void;
  openEditProject: (project: Project) => void;
  openCreateDelivery: (projectId?: string) => void;
  logout: () => Promise<void>;
}

const ShellContext = createContext<ShellActions | undefined>(undefined);

export function useShellActions() {
  const ctx = useContext(ShellContext);
  if (!ctx) {
    throw new Error("useShellActions must be used within Shell");
  }
  return ctx;
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const {
    role,
    profile,
    view,
    setView,
    pushToast,
    removeToast,
    toasts,
    state,
    actions,
  } = usePortalStore();

  const userDisplayName = useMemo(() => profile?.name || "Usuário", [profile]);
  const unreadNotifCount = useMemo(() => state.notifications.filter((n) => !n.read).length, [state.notifications]);

  const onNav = (nextView: typeof view) => {
    setView(nextView);
    if (nextView !== "DETALHE_ENTREGA") actions.setSelectedDeliveryId(null);
    if (nextView !== "DETALHE_PROJETO") actions.setSelectedProjectId(null);
  };

  const logout = async () => {
    await logoutSvc();
    actions.setSelectedDeliveryId(null);
    actions.setSelectedProjectId(null);
    actions.setSelectedProviderUid(null);
    setView("LOGIN");
    pushToast({ type: "info", title: "Sessão encerrada" });
  };

  const openCreateProject = () => {
    actions.setProjectForm({
      companyId: "",
      name: "",
      description: "",
      memberUids: [],
      projectType: "",
      projectTypeOther: "",
    });
    actions.setModals({ projectCreateOpen: true });
  };

  const openEditProject = (project: Project) => {
    actions.setProjectEditForm({
      id: project.id,
      companyId: project.companyId,
      companyName: project.companyName,
      name: project.name,
      description: project.description || "",
      memberUids: project.memberUids || [],
    });
    actions.setModals({ projectEditOpen: true });
  };

  const openCreateDelivery = (projectId?: string) => {
    actions.setDeliveryForm({
      projectId: projectId || "",
      title: "",
      deadline: "",
      priority: "MEDIA",
      providerUid: "",
      providerName: "",
      description: "",
    });
    actions.setModals({ deliveryCreateOpen: true });
  };

  const saveProject = async () => {
    if (!profile || profile.role !== "ADMIN") return;

    const companyId = state.projectForm.companyId;
    const company = state.companies.find((c) => c.id === companyId) || null;
    const name = sanitize(state.projectForm.name);
    const description = sanitize(state.projectForm.description);
    const projectType = state.projectForm.projectType;
    const projectTypeOther = sanitize(state.projectForm.projectTypeOther);

    if (!companyId || !company) {
      pushToast({ type: "error", title: "Selecione uma empresa válida" });
      return;
    }
    if (!name) {
      pushToast({ type: "error", title: "Informe o nome do projeto" });
      return;
    }
    if (!projectType) {
      pushToast({ type: "error", title: "Selecione o tipo de projeto" });
      return;
    }
    if (projectType === "OUTRO" && !projectTypeOther) {
      pushToast({ type: "error", title: "Informe o tipo de projeto" });
      return;
    }

    try {
      const createdAt = Date.now();
      let companyNumber = company.companyNumber;
      if (!companyNumber) {
        companyNumber = await getNextCompanyNumber();
        await updateCompany(company.id, { companyNumber });
      }
      if (!companyNumber) {
        pushToast({ type: "error", title: "Erro ao gerar número da empresa" });
        return;
      }

      const proposalSequence = await getNextProposalSequence(company.id);
      const date = new Date(createdAt);
      const month = `${date.getMonth() + 1}`.padStart(2, "0");
      const year = date.getFullYear();
      const proposalCode = `PR${String(companyNumber).padStart(2, "0")}-${String(proposalSequence).padStart(2, "0")}.${month}.${year}`;

      await createProject({
        companyId,
        companyName: company.name,
        name,
        description,
        manager: profile.name,
        managerUid: profile.uid,
        memberUids: state.projectForm.memberUids,
        status: "PROPOSTA",
        proposalCode,
        proposalSequence,
        projectType,
        ...(projectType === "OUTRO" ? { projectTypeOther } : {}),
        completionRate: 0,
        createdAt,
      });
      actions.setModals({ projectCreateOpen: false });
      pushToast({ type: "success", title: "Proposta criada" });
      setView("PROPOSTAS");
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao criar proposta", message: error?.message || "" });
    }
  };

  const saveProjectEdits = async () => {
    if (!profile || profile.role !== "ADMIN") return;

    const companyId = state.projectEditForm.companyId;
    const company = state.companies.find((c) => c.id === companyId) || null;
    const name = sanitize(state.projectEditForm.name);
    const description = sanitize(state.projectEditForm.description);

    if (!companyId || !company) {
      pushToast({ type: "error", title: "Selecione uma empresa válida" });
      return;
    }
    if (!name) {
      pushToast({ type: "error", title: "Informe o nome do projeto" });
      return;
    }

    try {
      await updateProjectSvc(state.projectEditForm.id, {
        companyId,
        companyName: company.name,
        name,
        description,
        memberUids: state.projectEditForm.memberUids,
      });
      actions.setModals({ projectEditOpen: false });
      pushToast({ type: "success", title: "Projeto atualizado" });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao atualizar projeto", message: error?.message || "" });
    }
  };

  const saveDelivery = async () => {
    if (!profile || profile.role !== "ADMIN") return;

    const project = state.projects.find((x) => x.id === state.deliveryForm.projectId);
    if (!project) {
      pushToast({ type: "error", title: "Selecione um projeto" });
      return;
    }
    if (project.status === "PROPOSTA" || project.status === "RECUSADA") {
      pushToast({ type: "error", title: "A proposta precisa ser aprovada antes de criar entregas" });
      return;
    }

    const title = sanitize(state.deliveryForm.title);
    const deadline = state.deliveryForm.deadline;

    if (!title) return pushToast({ type: "error", title: "Informe o título da entrega" });
    if (!deadline || !isValidDateISO(deadline)) return pushToast({ type: "error", title: "Informe um prazo válido" });
    if (!state.deliveryForm.providerUid) return pushToast({ type: "error", title: "Selecione um prestador" });

    try {
      const deliveryId = await createDelivery({
        projectId: project.id,
        client: project.companyName || "Empresa não definida",
        project: project.name,
        title,
        deadline,
        status: "PENDENTE",
        progress: "A_FAZER",
        priority: state.deliveryForm.priority,
        providerUid: state.deliveryForm.providerUid,
        provider: state.deliveryForm.providerName || "Prestador",
        description: sanitize(state.deliveryForm.description),
        checklist: [],
        createdAt: Date.now(),
      });
      await createNotification({
        toUid: state.deliveryForm.providerUid,
        type: "NEW_DELIVERY",
        title: `Nova entrega atribuída: ${title}`,
        projectId: project.id,
        deliveryId,
        createdAt: Date.now(),
        read: false,
      });
      actions.setModals({ deliveryCreateOpen: false });
      pushToast({ type: "success", title: "Entrega criada" });
      setView("ENTREGAS");
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao criar entrega", message: error?.message || "" });
    }
  };

  const deliveryProjects = useMemo(
    () => state.projects.filter((p) => p.status !== "PROPOSTA" && p.status !== "RECUSADA"),
    [state.projects]
  );

  const projectMembers = useMemo(() => {
    if (!state.deliveryForm.projectId) return [];
    const project = deliveryProjects.find((x) => x.id === state.deliveryForm.projectId);
    const memberUids = project?.memberUids || [];
    return state.users
      .filter((u) => u.role === "PRESTADOR" && u.active && u.status === "ACTIVE")
      .filter((u) => memberUids.includes(u.uid));
  }, [state.deliveryForm.projectId, deliveryProjects, state.users]);

  return (
    <ShellContext.Provider value={{ openCreateProject, openEditProject, openCreateDelivery, logout }}>
      <Toasts toasts={toasts} onClose={removeToast} />
      <div className="flex flex-col md:flex-row min-h-screen bg-[#F8FAFC]">
        {role ? (
          <Sidebar
            role={role}
            userName={userDisplayName}
            view={view}
            unread={unreadNotifCount}
            onNav={onNav}
            onLogout={logout}
          />
        ) : null}

        <Modal
          open={state.modals.projectCreateOpen}
          title="Criar Proposta"
          onClose={() => actions.setModals({ projectCreateOpen: false })}
        >
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Empresa</p>
              <select
                value={state.projectForm.companyId}
                onChange={(e) => actions.setProjectForm({ ...state.projectForm, companyId: e.target.value })}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner"
              >
                <option value="">Selecione uma empresa</option>
                {state.companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {state.companies.length === 0 ? (
                <p className="text-[10px] text-gray-400 mt-2">Cadastre uma empresa antes de criar projetos.</p>
              ) : null}
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Tipo de projeto</p>
              <select
                value={state.projectForm.projectType}
                onChange={(e) =>
                  actions.setProjectForm({
                    ...state.projectForm,
                    projectType: e.target.value as typeof state.projectForm.projectType,
                    projectTypeOther: e.target.value === "OUTRO" ? state.projectForm.projectTypeOther : "",
                  })
                }
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner"
              >
                <option value="">Selecione um tipo</option>
                <option value="INSPECAO">InspeÃ§Ã£o</option>
                <option value="ANALISE_FALHA">AnÃ¡lise de falha</option>
                <option value="DESENVOLVIMENTO_ENGENHARIA">Desenvolvimento de engenharia</option>
                <option value="OUTRO">Outro</option>
              </select>
              {state.projectForm.projectType === "OUTRO" ? (
                <input
                  value={state.projectForm.projectTypeOther}
                  onChange={(e) => actions.setProjectForm({ ...state.projectForm, projectTypeOther: e.target.value })}
                  className="w-full mt-3 px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner"
                  placeholder="Informe o tipo"
                />
              ) : null}
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Nome do projeto</p>
              <input
                value={state.projectForm.name}
                onChange={(e) => actions.setProjectForm({ ...state.projectForm, name: e.target.value })}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner"
                placeholder="Ex: Inspeção Guindaste X"
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Descrição (opcional)</p>
              <textarea
                value={state.projectForm.description}
                onChange={(e) => actions.setProjectForm({ ...state.projectForm, description: e.target.value })}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner min-h-[100px]"
                placeholder="Descreva o escopo e objetivos do projeto..."
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Membros do projeto</p>
              <select
                multiple
                value={state.projectForm.memberUids}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const selected = Array.from(e.currentTarget.selectedOptions).map((opt) => opt.value);
                  actions.setProjectForm({ ...state.projectForm, memberUids: selected });
                }}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner min-h-[120px]"
              >
                {state.users
                  .filter((u) => u.role === "PRESTADOR" && u.active && u.status === "ACTIVE")
                  .map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name}
                    </option>
                  ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-2">Dica: segure CTRL (Windows) ou CMD (Mac) para selecionar mais de um.</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => actions.setModals({ projectCreateOpen: false })}>
                Cancelar
              </Button>
              <Button onClick={saveProject}>Salvar proposta</Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={state.modals.projectEditOpen}
          title="Editar Projeto"
          onClose={() => actions.setModals({ projectEditOpen: false })}
        >
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Empresa</p>
              <select
                value={state.projectEditForm.companyId}
                onChange={(e) => actions.setProjectEditForm({ ...state.projectEditForm, companyId: e.target.value })}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner"
              >
                <option value="">Selecione uma empresa</option>
                {state.projectEditForm.companyId &&
                !state.companies.find((c) => c.id === state.projectEditForm.companyId) ? (
                  <option value={state.projectEditForm.companyId}>
                    {state.projectEditForm.companyName || "Empresa removida"}
                  </option>
                ) : null}
                {state.companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Projeto</p>
              <input
                value={state.projectEditForm.name}
                onChange={(e) => actions.setProjectEditForm({ ...state.projectEditForm, name: e.target.value })}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner"
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Descrição</p>
              <textarea
                value={state.projectEditForm.description}
                onChange={(e) => actions.setProjectEditForm({ ...state.projectEditForm, description: e.target.value })}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner min-h-[100px]"
                placeholder="Descreva o escopo e objetivos do projeto..."
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Membros do projeto</p>
              <select
                multiple
                value={state.projectEditForm.memberUids}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const selected = Array.from(e.currentTarget.selectedOptions).map((opt) => opt.value);
                  actions.setProjectEditForm({ ...state.projectEditForm, memberUids: selected });
                }}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner min-h-[120px]"
              >
                {state.users
                  .filter((u) => u.role === "PRESTADOR" && u.active && u.status === "ACTIVE")
                  .map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name}
                    </option>
                  ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-2">
                Selecione os membros que você deseja manter. Desmarque para remover.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => actions.setModals({ projectEditOpen: false })}>
                Cancelar
              </Button>
              <Button onClick={saveProjectEdits}>Salvar Alterações</Button>
            </div>
          </div>
        </Modal>

        <Modal
          open={state.modals.deliveryCreateOpen}
          title="Solicitar Entrega"
          onClose={() => actions.setModals({ deliveryCreateOpen: false })}
        >
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Projeto</p>
              <select
                value={state.deliveryForm.projectId}
                onChange={(e) =>
                  actions.setDeliveryForm({
                    ...state.deliveryForm,
                    projectId: e.target.value,
                    providerUid: "",
                    providerName: "",
                  })
                }
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner"
              >
                <option value="">Selecione</option>
                {deliveryProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.companyName} - {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Título</p>
              <input
                value={state.deliveryForm.title}
                onChange={(e) => actions.setDeliveryForm({ ...state.deliveryForm, title: e.target.value })}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner"
                placeholder="Ex: Relatório final..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Prazo</p>
                <input
                  type="date"
                  value={state.deliveryForm.deadline}
                  onChange={(e) => actions.setDeliveryForm({ ...state.deliveryForm, deadline: e.target.value })}
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner"
                />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Prioridade</p>
                <select
                  value={state.deliveryForm.priority}
                  onChange={(e) =>
                    actions.setDeliveryForm({ ...state.deliveryForm, priority: e.target.value as Priority })
                  }
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner"
                >
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                </select>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                Prestador (somente membros do projeto)
              </p>
              <select
                value={state.deliveryForm.providerUid}
                onChange={(e) => {
                  const uid = e.target.value;
                  const user = state.users.find((x) => x.uid === uid) || null;
                  actions.setDeliveryForm({
                    ...state.deliveryForm,
                    providerUid: uid,
                    providerName: user?.name || "",
                  });
                }}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner"
                disabled={!state.deliveryForm.projectId}
              >
                <option value="">Selecione</option>
                {projectMembers.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.name}
                  </option>
                ))}
              </select>

              {!state.deliveryForm.projectId ? (
                <p className="text-[10px] text-gray-400 mt-2">Selecione um projeto para carregar os membros.</p>
              ) : null}
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Descrição (opcional)</p>
              <textarea
                value={state.deliveryForm.description}
                onChange={(e) => actions.setDeliveryForm({ ...state.deliveryForm, description: e.target.value })}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner min-h-[120px]"
                placeholder="Escopo e observações..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => actions.setModals({ deliveryCreateOpen: false })}>
                Cancelar
              </Button>
              <Button onClick={saveDelivery}>Salvar</Button>
            </div>
          </div>
        </Modal>

        <main className="flex-1 md:ml-80 p-8 md:p-16">
          <div className="max-w-6xl mx-auto space-y-10">{children}</div>
        </main>
      </div>
    </ShellContext.Provider>
  );
}
