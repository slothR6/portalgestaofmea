import React, { useState } from "react";
import { loginEmail, loginGoogle, sendPasswordReset } from "../services/auth";
import Logo from "../components/Logo";
import Toasts from "../components/ui/Toasts";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { usePortalStore } from "../hooks/usePortalStore";

export default function LoginPage() {
  const { pushToast, toasts, removeToast, setView } = usePortalStore();
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);

  const doLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await loginEmail(email, senha);
      pushToast({ type: "success", title: "Login realizado" });
    } catch (e: any) {
      setAuthError(e?.message || "Não foi possível entrar.");
      pushToast({ type: "error", title: "Falha no login", message: e?.message || "" });
    } finally {
      setAuthLoading(false);
    }
  };

  const doGoogle = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await loginGoogle();
      pushToast({ type: "success", title: "Conectado com Google", message: "Se for primeiro acesso, ficará pendente." });
    } catch (e: any) {
      setAuthError(e?.message || "Não foi possível entrar com Google.");
      pushToast({ type: "error", title: "Falha no Google", message: e?.message || "" });
    } finally {
      setAuthLoading(false);
    }
  };

  const doResetPassword = async () => {
    if (!email || !email.trim()) {
      pushToast({ type: "error", title: "Digite seu email no campo acima" });
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      await sendPasswordReset(email);
      pushToast({ type: "success", title: "Email enviado!", message: "Verifique sua caixa de entrada e spam." });
      setResetPasswordModalOpen(false);
    } catch (e: any) {
      setAuthError(e?.message || "Erro ao enviar email de recuperação.");
      pushToast({ type: "error", title: "Erro", message: e?.message || "" });
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <>
      <Toasts toasts={toasts} onClose={removeToast} />
      <div className="min-h-screen flex items-center justify-center bg-[#D6DCE5] p-6 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#75AD4D] opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#1895BD] opacity-10 rounded-full blur-3xl"></div>

        <Card className="max-w-xl w-full py-16 px-12 z-10">
          <div className="mb-10 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 rotate-3 shadow-xl border border-gray-100">
              <Logo size={72} />
            </div>
            <h1 className="text-[#1895BD] uppercase tracking-tighter mb-4">Portal FMEA</h1>
            <p className="text-gray-500 max-w-md mx-auto text-lg leading-relaxed">
              Faça login para acessar. Se for primeiro acesso, ficará pendente de aprovação.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">E-mail</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none transition-all shadow-inner"
                placeholder="email"
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Senha</p>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none transition-all shadow-inner"
                placeholder="senha"
              />
            </div>

            {authError ? (
              <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-sm font-bold">
                {authError}
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <Button onClick={doLogin} disabled={authLoading || !email || !senha} className="w-full">
                {authLoading ? "Entrando..." : "Entrar"}
              </Button>
              <Button variant="outline" onClick={doGoogle} disabled={authLoading} className="w-full">
                Entrar com Google
              </Button>
            </div>

            <button
              onClick={() => setResetPasswordModalOpen(true)}
              className="text-xs text-gray-400 hover:text-gray-600 font-bold uppercase tracking-widest"
            >
              Esqueci minha senha
            </button>

            <div className="border-t border-gray-100 pt-6 text-center">
              <p className="text-sm text-gray-500 mb-3">Ainda não tem conta?</p>
              <Button variant="outline" onClick={() => setView("SIGNUP")} className="w-full">
                Criar conta
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Modal open={resetPasswordModalOpen} title="Recuperar Senha" onClose={() => setResetPasswordModalOpen(false)}>
        <div className="space-y-5">
          <p className="text-gray-600">Digite seu email cadastrado. Você receberá um link para criar uma nova senha.</p>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">E-mail</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner"
              placeholder="seu@email.com"
            />
          </div>

          {authError ? (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-sm font-bold">
              {authError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setResetPasswordModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={doResetPassword} disabled={authLoading || !email}>
              {authLoading ? "Enviando..." : "Enviar email"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
