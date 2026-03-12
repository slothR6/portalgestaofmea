import React, { useState } from "react";
import { loginGoogle, sendPasswordReset, signupEmail } from "../services/auth";
import Logo from "../components/Logo";
import Toasts from "../components/ui/Toasts";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import { usePortalStore } from "../hooks/usePortalStore";

export default function SignupPage() {
  const { pushToast, toasts, removeToast, setView } = usePortalStore();
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);

  const doSignup = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signupEmail({ name: nome, email, password: senha, pixKey });
      pushToast({ type: "success", title: "Conta criada", message: "Aguardando aprovação do admin." });
    } catch (e: any) {
      setAuthError(e?.message || "Não foi possível criar conta.");
      pushToast({ type: "error", title: "Falha ao criar conta", message: e?.message || "" });
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
            <h1 className="text-[#1895BD] uppercase tracking-tighter mb-4">Criar Conta</h1>
            <p className="text-gray-500 max-w-md mx-auto text-lg leading-relaxed">
              Após o cadastro, o acesso fica pendente de aprovação do administrador.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Nome</p>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none transition-all shadow-inner"
                placeholder="Seu nome"
              />
            </div>

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
                placeholder="mínimo 6 caracteres"
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Chave Pix (opcional)</p>
              <input
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none transition-all shadow-inner"
                placeholder="CPF, e-mail, telefone, aleatória..."
              />
            </div>

            {authError ? (
              <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-sm font-bold">
                {authError}
              </div>
            ) : null}

            <Button className="w-full" onClick={doSignup} disabled={authLoading || !email || !senha || !nome}>
              {authLoading ? "Criando..." : "Criar conta"}
            </Button>

            <Button className="w-full" variant="outline" onClick={doGoogle} disabled={authLoading}>
              Criar/Entrar com Google
            </Button>

            <button
              className="w-full text-center text-sm font-black text-[#1895BD] uppercase tracking-widest mt-4"
              onClick={() => {
                setAuthError(null);
                setView("LOGIN");
              }}
            >
              Voltar para login
            </button>

            <button
              onClick={() => setResetPasswordModalOpen(true)}
              className="text-xs text-gray-400 hover:text-gray-600 font-bold uppercase tracking-widest"
            >
              Esqueci minha senha
            </button>
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
