import React from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { usePortalStore } from "../hooks/usePortalStore";
import { usePagination } from "../hooks/usePagination";
import { approveUser as approveUserSvc, rejectUser as rejectUserSvc, softDeleteUser } from "../services/portal";
import { UserProfile, UserRole } from "../types";

export default function UsersPage() {
  const { state, actions, pushToast } = usePortalStore();
  const usersPaged = usePagination(state.users);

  const approveUser = async (user: UserProfile, newRole: UserRole) => {
    try {
      await approveUserSvc(user.uid, newRole);
      pushToast({ type: "success", title: "Usuário aprovado", message: `${user.name} -> ${newRole}` });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao aprovar usuário", message: error?.message || "" });
    }
  };

  const rejectUser = async (user: UserProfile) => {
    try {
      await rejectUserSvc(user.uid);
      pushToast({ type: "info", title: "Usuário rejeitado", message: user.name });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao rejeitar usuário", message: error?.message || "" });
    }
  };

  const removeUser = async (user: UserProfile) => {
    if (!confirm(`Remover usuário "${user.name}"? (soft delete)`)) return;
    try {
      await softDeleteUser(user.uid);
      pushToast({ type: "success", title: "Usuário removido", message: user.name });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao remover usuário", message: error?.message || "" });
    }
  };

  const openUserProfile = (user: UserProfile) => {
    actions.setSelectedUserProfile(user);
  };

  const closeUserProfile = () => {
    actions.setSelectedUserProfile(null);
  };

  return (
    <>
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white px-8 py-6">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-200">Usuários</p>
        <h1 className="text-3xl font-black mt-2">Usuários</h1>
        <p className="text-slate-200 mt-1">Aprovação e gestão.</p>
      </div>

      <Card>
        <h3 className="text-xl font-black mb-6 text-slate-800">Pendentes</h3>
        <div className="space-y-4">
          {usersPaged.sliced
            .filter((u) => u.status === "PENDING")
            .map((u) => (
              <div
                key={u.uid}
                className="p-6 border border-slate-200 rounded-3xl bg-white shadow-sm flex flex-col lg:flex-row lg:items-center gap-6"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-black text-slate-900">{u.name}</p>
                  <p className="text-sm text-slate-500">{u.email}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-3">UID: {u.uid}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="px-4 py-2" onClick={() => openUserProfile(u)}>
                    Ver perfil
                  </Button>
                  <Button variant="secondary" className="px-4 py-2" onClick={() => approveUser(u, "PRESTADOR")}>
                    Aprovar Prestador
                  </Button>
                  <Button variant="primary" className="px-4 py-2" onClick={() => approveUser(u, "ADMIN")}>
                    Aprovar Admin
                  </Button>
                  <Button variant="danger" className="px-4 py-2" onClick={() => rejectUser(u)}>
                    Rejeitar
                  </Button>
                  <Button variant="outline" className="px-4 py-2" onClick={() => removeUser(u)}>
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          {state.users.filter((u) => u.status === "PENDING").length === 0 ? (
            <div className="py-10 text-center text-gray-300">Sem usuários pendentes.</div>
          ) : null}

          {usersPaged.canLoadMore ? (
            <div className="pt-4 flex justify-center">
              <Button variant="outline" onClick={usersPaged.loadMore}>
                Carregar mais
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="mt-8">
        <h3 className="text-xl font-black mb-6 text-slate-800">Ativos</h3>
        <div className="space-y-3">
          {state.users
            .filter((u) => u.status === "ACTIVE")
            .slice(0, 50)
            .map((u) => (
              <div
                key={u.uid}
                className="p-5 border border-slate-200 rounded-3xl bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <p className="text-base font-black text-slate-900">{u.name}</p>
                  <p className="text-sm text-slate-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{u.role}</span>
                  <Button variant="outline" className="px-4 py-2" onClick={() => openUserProfile(u)}>
                    Ver perfil
                  </Button>
                  <Button variant="outline" className="px-4 py-2" onClick={() => removeUser(u)}>
                    Remover
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </Card>

      <Modal open={!!state.selectedUserProfile} title="Perfil do usuário" onClose={closeUserProfile}>
        {state.selectedUserProfile ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Nome</p>
              <p className="text-lg font-black text-slate-900 mt-2">{state.selectedUserProfile.name}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Email</p>
              <p className="text-sm font-bold text-slate-700 mt-2">{state.selectedUserProfile.email}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Chave Pix</p>
              <p className="text-sm font-bold text-slate-700 mt-2">
                {state.selectedUserProfile.pixKey || "Não informado"}
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
