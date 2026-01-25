import React from "react";
import { usePortalStore } from "../hooks/usePortalStore";
import { useShellActions } from "../app/layout/Shell";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { deleteNotification as deleteNotificationSvc, markNotificationRead as markNotificationReadSvc, markNotificationsRead } from "../services/notifications";
import { getNotificationLocation } from "../utils/notifications";

export default function DashboardPage() {
  const { role, user, state, pushToast } = usePortalStore();
  const { openCreateProject } = useShellActions();
  const unreadNotifCount = state.notifications.filter((n) => !n.read).length;

  const markNotificationRead = async (id: string) => {
    try {
      await markNotificationReadSvc(id);
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao marcar notificação", message: error?.message || "" });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteNotificationSvc(id);
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao excluir notificação", message: error?.message || "" });
    }
  };

  const markAllNotificationsRead = async () => {
    if (!user) return;
    try {
      const unread = state.notifications.filter((n) => !n.read);
      await markNotificationsRead(unread.map((n) => n.id));
      pushToast({ type: "success", title: "Notificações marcadas como lidas" });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao marcar notificações", message: error?.message || "" });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#1895BD] mb-2">Resumo</h1>
          <p className="text-gray-400">Visão geral e notificações.</p>
        </div>
        <div className="flex gap-3">
          {role === "ADMIN" ? (
            <>
              <Button variant="outline" onClick={markAllNotificationsRead} disabled={unreadNotifCount === 0}>
                Marcar notificações como lidas
              </Button>
              <Button variant="secondary" onClick={openCreateProject}>
                + Novo projeto
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Entregas Pendentes</p>
          <p className="text-4xl font-black text-[#1895BD]">
            {state.deliveries.filter((d) => d.status === "PENDENTE").length}
          </p>
        </Card>

        <Card>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Em Revisão</p>
          <p className="text-4xl font-black text-[#75AD4D]">
            {state.deliveries.filter((d) => d.status === "REVISAO").length}
          </p>
        </Card>

        <Card>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Atrasadas</p>
          <p className="text-4xl font-black text-red-500">
            {state.deliveries.filter((d) => d.status === "ATRASADO").length}
          </p>
        </Card>

        <Card>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
            {role === "ADMIN" ? "Usuários Pendentes" : "Projetos Ativos"}
          </p>
          <p className="text-4xl font-black text-orange-500">
            {role === "ADMIN" ? state.users.filter((u) => u.status === "PENDING").length : state.projects.length}
          </p>
        </Card>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl text-gray-800">Notificações</h3>
            {unreadNotifCount > 0 ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-[#1895BD]">
                {unreadNotifCount} nova(s)
              </span>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          {state.notifications.slice(0, 15).map((n) => (
            <div key={n.id} className="p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  n.read ? "bg-gray-100 text-gray-500" : "bg-blue-50 text-[#1895BD]"
                }`}
              >
                {n.type === "COMMENT"
                  ? "💬"
                  : n.type === "SUBMITTED"
                  ? "📤"
                  : n.type === "APPROVED"
                  ? "✅"
                  : n.type === "MEETING"
                  ? "📅"
                  : n.type === "NEW_DELIVERY"
                  ? "📦"
                  : n.type === "STARTED"
                  ? "🚀"
                  : n.type === "DEADLINE_CHANGE_REQUESTED"
                  ? "⏰"
                  : n.type === "DEADLINE_CHANGE_APPROVED"
                  ? "✅"
                  : n.type === "DEADLINE_CHANGE_REJECTED"
                  ? "⛔"
                  : "🛠️"}
              </div>
              <div className="flex-1">
                <p className={`font-black ${n.read ? "text-gray-600" : "text-gray-800"}`}>{n.title}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {new Date(n.createdAt).toLocaleString("pt-BR")}
                </p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Aba: {getNotificationLocation(n.type)}
                </p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                {!n.read ? (
                  <button
                    onClick={() => markNotificationRead(n.id)}
                    className="text-[10px] font-black uppercase tracking-widest text-[#75AD4D] hover:text-[#639441]"
                  >
                    Marcar lida
                  </button>
                ) : null}
                <button
                  onClick={() => deleteNotification(n.id)}
                  className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
          {state.notifications.length === 0 ? (
            <div className="py-10 text-center text-gray-300">Sem notificações.</div>
          ) : null}
        </div>
      </Card>
    </>
  );
}
