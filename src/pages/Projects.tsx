import React, { useMemo } from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import { usePortalStore } from "../hooks/usePortalStore";
import { useProjectsState } from "../hooks/usePortalCollections";
import { usePagination } from "../hooks/usePagination";
import { useShellActions } from "../app/layout/Shell";
import { deleteProject as deleteProjectSvc } from "../services/portal";
import { Project } from "../types";
import { formatCurrency } from "../utils/formatters";
import { getProjectTypeLabel } from "../utils/projects";

export default function ProjectsPage() {
  const { role, setView, pushToast } = usePortalStore();
  const { projects, selectedProjectId, setSelectedProjectId } = useProjectsState();
  const { openCreateProject, openEditProject } = useShellActions();
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== "PROPOSTA" && p.status !== "RECUSADA"),
    [projects]
  );
  const projectsPaged = usePagination(activeProjects);

  const deleteProject = async (project: Project) => {
    if (!confirm(`Excluir o projeto "${project.name}"? Isso também removerá as entregas dele.`)) return;
    try {
      await deleteProjectSvc(project.id);
      pushToast({ type: "success", title: "Projeto excluído" });
      setView("PROJETOS");
      if (selectedProjectId === project.id) setSelectedProjectId(null);
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao excluir projeto", message: error?.message || "" });
    }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 rounded-[32px] border border-[#013d23]/10 bg-white px-8 py-7 shadow-[0_28px_70px_-55px_rgba(15,23,42,0.45)]">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#013d23]">Projetos</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Projetos</h1>
          <p className="mt-1 text-slate-500">Projetos derivados de propostas aprovadas e acompanhados pela operacao.</p>
        </div>
        {role === "ADMIN" ? (
          <Button variant="primary" onClick={openCreateProject}>
            Nova proposta
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {projectsPaged.sliced.map((project) => (
          <Card
            key={project.id}
            onClick={() => {
              setSelectedProjectId(project.id);
              setView("DETALHE_PROJETO");
            }}
            className="bg-gradient-to-br from-white via-white to-slate-50"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">{project.companyName}</p>
                <h3 className="mt-3 text-2xl text-slate-900 font-black truncate">{project.name}</h3>
                <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                  {project.description || "Sem descrição cadastrada."}
                </p>
              </div>
              <Badge type="status" value={project.status.replace("_", " ")} />
            </div>

            <div className="mt-6 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
              <div className="h-12 w-12 rounded-2xl border border-slate-200 bg-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center justify-center">
                Logo
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Empresa</p>
                <p className="text-sm font-bold text-slate-700 truncate">{project.companyName}</p>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-200 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Progresso</p>
                  <p className="mt-2 font-black text-slate-900">{project.completionRate}%</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Modulos</p>
                  <p className="mt-2 font-black text-slate-900">{project.modules?.length || 0}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Estrutura</p>
                <p className="mt-2 font-bold text-slate-900">
                  {getProjectTypeLabel(project.projectType, project.projectTypeOther)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Receita prevista: {formatCurrency(project.financial?.plannedRevenue || project.proposalValue)}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Gestor</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{project.manager}</p>
                </div>
                {role === "ADMIN" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="px-4 py-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditProject(project);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      className="px-4 py-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteProject(project);
                      }}
                    >
                      Excluir
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {projectsPaged.canLoadMore ? (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={projectsPaged.loadMore}>
            Carregar mais
          </Button>
        </div>
      ) : null}
    </>
  );
}
