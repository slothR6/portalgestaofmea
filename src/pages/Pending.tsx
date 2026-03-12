import React from "react";
import Logo from "../components/Logo";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Toasts from "../components/ui/Toasts";
import { usePortalStore } from "../hooks/usePortalStore";
import { logout } from "../services/auth";

export default function PendingPage() {
  const { profile, pushToast, toasts, removeToast, setView, actions } = usePortalStore();

  const doLogout = async () => {
    await logout();
    setView("LOGIN");
    actions.setSelectedDeliveryId(null);
    actions.setSelectedProjectId(null);
    actions.setSelectedProviderUid(null);
    pushToast({ type: "info", title: "Sessão encerrada" });
  };

  if (!profile) return null;

  return (
    <>
      <Toasts toasts={toasts} onClose={removeToast} />
      <div className="min-h-screen flex items-center justify-center bg-[#D6DCE5] p-6">
        <Card className="max-w-xl w-full text-center py-16 px-12">
          <div className="mb-8">
            <div className="w-20 h-20 bg-white rounded-3xl mx-auto flex items-center justify-center mb-6 border border-gray-100 shadow-sm">
              <Logo size={56} />
            </div>
            <h1 className="text-[#1895BD] uppercase tracking-tighter mb-4">Acesso pendente</h1>
            <p className="text-gray-500 text-lg leading-relaxed">
              A conta foi criada, mas ainda não foi aprovada por um administrador.
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-6 text-left">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Conta</p>
            <p className="font-black text-gray-800">{profile.name}</p>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <p className="text-xs text-gray-400 mt-3">
              Status: <span className="font-black">{profile.status}</span>
            </p>
          </div>

          <div className="mt-10">
            <Button variant="outline" onClick={doLogout} className="w-full">
              Sair
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
