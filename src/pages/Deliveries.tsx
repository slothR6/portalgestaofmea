import React, { useMemo } from "react";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import { usePortalStore } from "../hooks/usePortalStore";
import { usePagination } from "../hooks/usePagination";
import { resolveProgress } from "../utils/deliveries";
import { useShellActions } from "../app/layout/Shell";
import { deleteDelivery } from "../services/portal";
import { Progress } from "../types";

export default function DeliveriesPage() {
  const { role, state, actions, setView, pushToast } = usePortalStore();
  const { openCreateDelivery } = useShellActions();
  const deliveriesPaged = usePagination(state.deliveries);

  const deliveriesByProgress = useMemo(() => {
    const columns: Record<Progress, typeof deliveriesPaged.sliced> = {
      A_FAZER: [],
      FAZENDO: [],
      REVISAO: [],
      APROVADO: [],
    };
    deliveriesPaged.sliced.forEach((delivery) => {
      const progress = resolveProgress(delivery.status, delivery.progress);
      columns[progress].push(delivery);
    });
    return columns;
  }, [deliveriesPaged.sliced]);

  const deliveryColumns: { key: Progress; title: string; subtitle: string }[] = [
    { key: "A_FAZER", title: "A fazer", subtitle: "Backlog" },
    { key: "FAZENDO", title: "Fazendo", subtitle: "Em execução" },
    { key: "REVISAO", title: "Revisão", subtitle: "Qualidade" },
    { key: "APROVADO", title: "Aprovado", subtitle: "Histórico" },
  ];

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

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white px-8 py-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-200">
            {role === "ADMIN" ? "Entregas" : "Minhas Entregas"}
          </p>
          <h1 className="text-3xl font-black mt-2">{role === "ADMIN" ? "Entregas" : "Minhas Entregas"}</h1>
          <p className="text-slate-200 mt-1">Controle de execução e revisão.</p>
        </div>
        {role === "ADMIN" ? (
          <Button variant="primary" onClick={() => openCreateDelivery()}>
            + Solicitar entrega
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {deliveryColumns.map((column) => (
          <div
            key={column.key}
            className="flex flex-col rounded-3xl border border-slate-200 bg-slate-50/80 max-h-[720px]"
          >
            <div className="sticky top-0 z-10 px-5 py-4 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">{column.subtitle}</p>
                  <h3 className="text-lg font-black text-slate-800">{column.title}</h3>
                </div>
                <span className="text-xs font-black text-slate-500">{deliveriesByProgress[column.key].length}</span>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              {deliveriesByProgress[column.key].map((delivery) => (
                <div
                  key={delivery.id}
                  onClick={() => {
                    actions.setSelectedDeliveryId(delivery.id);
                    setView("DETALHE_ENTREGA");
                  }}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{delivery.client}</p>
                      <h4 className="mt-2 text-lg font-black text-slate-900 truncate">{delivery.title}</h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-700 mt-2 truncate">
                        {delivery.project}
                      </p>
                    </div>
                    <Badge type="priority" value={delivery.priority} />
                  </div>

                  <div className="mt-4 grid gap-3 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span className="uppercase tracking-[0.3em] font-black text-[9px]">Prazo</span>
                      <span className="text-sm font-bold text-slate-700">{delivery.deadline}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="uppercase tracking-[0.3em] font-black text-[9px]">Prestador</span>
                      <span className="text-sm font-bold text-slate-700 truncate max-w-[140px]">
                        {delivery.provider || "A definir"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <Badge type="status" value={delivery.status} />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="px-3 py-2"
                        onClick={(event) => {
                          event.stopPropagation();
                          actions.setSelectedDeliveryId(delivery.id);
                          setView("DETALHE_ENTREGA");
                        }}
                      >
                        Abrir
                      </Button>
                      {role === "ADMIN" ? (
                        <Button
                          variant="danger"
                          className="px-3 py-2"
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
                </div>
              ))}
              {deliveriesByProgress[column.key].length === 0 ? (
                <div className="py-10 text-center text-slate-300 text-sm">Nenhuma entrega aqui.</div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {deliveriesPaged.canLoadMore ? (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={deliveriesPaged.loadMore}>
            Carregar mais
          </Button>
        </div>
      ) : null}
    </>
  );
}
