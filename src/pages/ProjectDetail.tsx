import React, { useMemo, useState } from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import { usePortalStore } from "../hooks/usePortalStore";
import { useShellActions } from "../app/layout/Shell";
import { deleteDelivery, updateProject as updateProjectSvc } from "../services/portal";
import { ExternalLink } from "../types";
import { sanitize } from "../utils/sanitize";
import { isValidExternalUrl } from "../utils/urls";

export default function ProjectDetailPage() {
  const { state, role, pushToast, actions, setView, user } = usePortalStore();
  const { openEditProject, openCreateDelivery } = useShellActions();
  const [projectLinkForm, setProjectLinkForm] = useState({ title: "", url: "" });

  const selectedProject = useMemo(
    () => state.projects.find((p) => p.id === state.selectedProjectId) || null,
    [state.projects, state.selectedProjectId]
  );

  const buildExternalLink = (title: string, url: string): ExternalLink => ({
    id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    url,
    createdAt: Date.now(),
    createdByUid: user?.uid || "",
  });

  const addProjectLink = async () => {
    if (!selectedProject || !user || role !== "ADMIN") return;
    const title = sanitize(projectLinkForm.title);
    const url = sanitize(projectLinkForm.url);

    if (!title) return pushToast({ type: "error", title: "Informe o título do link" });
    if (!url || !isValidExternalUrl(url)) {
      return pushToast({ type: "error", title: "URL inválida (use http:// ou https://)" });
    }

    try {
      const nextLinks = [...(selectedProject.externalLinks || []), buildExternalLink(title, url)];
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
      pushToast({ type: "success", title: "Entrega excluída" });
      if (state.selectedDeliveryId === deliveryId) actions.setSelectedDeliveryId(null);
      setView("ENTREGAS");
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao excluir entrega", message: error?.message || "" });
    }
  };

  if (!selectedProject) return null;

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white px-8 py-6">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setView("PROJETOS")}
            className="text-xs font-black uppercase tracking-[0.4em] text-slate-200 hover:text-white text-left"
          >
            ← Projetos
          </button>
          <h1 className="text-3xl font-black">{selectedProject.name}</h1>
        </div>

        {role === "ADMIN" ? (
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={() => openEditProject(selectedProject)}>
              Editar projeto
            </Button>
            <Button variant="primary" onClick={() => openCreateDelivery(selectedProject.id)}>
              + Solicitar entrega
            </Button>
          </div>
        ) : null}
      </div>

      {selectedProject.description ? (
        <Card>
          <h3 className="text-xl mb-3">Descrição do Projeto</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{selectedProject.description}</p>
        </Card>
      ) : null}

      <Card>
        <h3 className="text-xl mb-4">Informações</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Empresa</p>
            <p className="font-bold text-gray-800">{selectedProject.companyName}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Gestor</p>
            <p className="font-bold text-gray-800">{selectedProject.manager}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Status</p>
            <p className="font-bold text-gray-800">{selectedProject.status.replace("_", " ")}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Membros</p>
            <p className="font-bold text-gray-800">{selectedProject.memberUids.length} prestador(es)</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-xl mb-4">Links</h3>
        <div className="space-y-3">
          {(selectedProject.externalLinks || []).map((link) => (
            <div key={link.id} className="p-4 border border-gray-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-bold text-gray-800 truncate">{link.title}</p>
                <p className="text-xs text-gray-400 truncate">{link.url}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  className="text-xs font-black uppercase tracking-widest text-[#1895BD] hover:underline"
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
            <div className="py-6 text-center text-gray-300">Nenhum link adicionado.</div>
          ) : null}
        </div>

        {role === "ADMIN" ? (
          <div className="mt-6 p-5 border border-gray-100 rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Adicionar link</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={projectLinkForm.title}
                onChange={(e) => setProjectLinkForm((f) => ({ ...f, title: e.target.value }))}
                className="px-4 py-3 border border-gray-100 rounded-xl"
                placeholder="Título"
              />
              <input
                value={projectLinkForm.url}
                onChange={(e) => setProjectLinkForm((f) => ({ ...f, url: e.target.value }))}
                className="px-4 py-3 border border-gray-100 rounded-xl"
                placeholder="https://..."
              />
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={addProjectLink}>Adicionar link</Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card>
        <h3 className="text-xl mb-4">Entregas do projeto</h3>
        <div className="space-y-3">
          {state.deliveries
            .filter((delivery) => delivery.projectId === selectedProject.id)
            .map((delivery) => (
              <div
                key={delivery.id}
                onClick={() => {
                  actions.setSelectedDeliveryId(delivery.id);
                  setView("DETALHE_ENTREGA");
                }}
                className="p-5 border border-gray-100 rounded-2xl hover:bg-gray-50 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <p className="font-black text-gray-800">{delivery.title}</p>
                  <p className="text-xs text-gray-500">Prestador: {delivery.provider}</p>
                  <p className="text-xs text-gray-500">Prazo: {delivery.deadline}</p>
                </div>
                <div className="flex gap-3 items-center">
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
          {state.deliveries.filter((delivery) => delivery.projectId === selectedProject.id).length === 0 ? (
            <div className="py-10 text-center text-gray-300">Nenhuma entrega ainda.</div>
          ) : null}
        </div>
      </Card>
    </>
  );
}
