import React, { useMemo } from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { usePortalStore } from "../hooks/usePortalStore";
import { usePagination } from "../hooks/usePagination";
import { useShellActions } from "../app/layout/Shell";
import { formatDateTime } from "../utils/dates";
import { Project } from "../types";

function getProjectTypeLabel(project: Project) {
  if (project.projectType === "OUTRO") return project.projectTypeOther || "Outro";
  if (project.projectType === "INSPECAO") return "Inspeção";
  if (project.projectType === "ANALISE_FALHA") return "Análise de falha";
  if (project.projectType === "DESENVOLVIMENTO_ENGENHARIA") return "Desenvolvimento de engenharia";
  return "Não informado";
}

export default function ProposalsPage() {
  const { state, actions, setView } = usePortalStore();
  const { openCreateProject } = useShellActions();

  const proposals = useMemo(() => state.projects.filter((p) => p.status === "PROPOSTA"), [state.projects]);
  const proposalsPaged = usePagination(proposals);

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white px-8 py-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-200">Propostas</p>
          <h1 className="text-3xl font-black mt-2">Propostas</h1>
          <p className="text-slate-200 mt-1">Avaliação e aprovação.</p>
        </div>
        <Button variant="primary" onClick={openCreateProject}>
          + Nova Proposta
        </Button>
      </div>

      {proposalsPaged.sliced.length === 0 ? (
        <div className="py-10 text-center text-slate-300 text-sm">Nenhuma proposta pendente.</div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {proposalsPaged.sliced.map((proposal) => (
          <Card
            key={proposal.id}
            onClick={() => {
              actions.setSelectedProjectId(proposal.id);
              setView("DETALHE_PROJETO");
            }}
            className="bg-gradient-to-br from-white via-white to-slate-50"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">{proposal.companyName}</p>
                <h3 className="mt-3 text-2xl text-slate-900 font-black truncate">{proposal.name}</h3>
                <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                  {proposal.description || "Sem descrição cadastrada."}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Código</p>
              <p className="text-sm font-bold text-slate-700">{proposal.proposalCode || "Não informado"}</p>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Tipo</p>
              <p className="text-sm font-bold text-slate-700">{getProjectTypeLabel(proposal)}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Criada em</p>
              <p className="text-sm font-bold text-slate-700">{formatDateTime(proposal.createdAt)}</p>
            </div>
          </Card>
        ))}
      </div>

      {proposalsPaged.canLoadMore ? (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={proposalsPaged.loadMore}>
            Carregar mais
          </Button>
        </div>
      ) : null}
    </>
  );
}
