import React, { useMemo, useState } from "react";
import { EmailAuthProvider, linkWithCredential } from "firebase/auth";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { usePortalStore } from "../hooks/usePortalStore";
import { useShellActions } from "../app/layout/Shell";
import { useOwnSafetyDocs } from "../hooks/useOwnSafetyDocs";

export default function ProfilePage() {
  const { user, profile, pushToast } = usePortalStore();
  const { logout } = useShellActions();
  const ownSafetyDocs = useOwnSafetyDocs(profile?.role === "PRESTADOR" ? profile.uid : null);
  const [linkPassword, setLinkPassword] = useState("");
  const [linkPasswordConfirm, setLinkPasswordConfirm] = useState("");
  const [linkingPassword, setLinkingPassword] = useState(false);

  const hasGoogleProvider = useMemo(
    () => user?.providerData?.some((p) => p.providerId === "google.com") ?? false,
    [user?.providerData]
  );
  const hasPasswordProvider = useMemo(
    () => user?.providerData?.some((p) => p.providerId === "password") ?? false,
    [user?.providerData]
  );

  const doLinkPassword = async () => {
    if (!user) return;
    if (hasPasswordProvider) {
      pushToast({ type: "info", title: "Email/senha ja vinculado a esta conta." });
      return;
    }
    if (!user.email) {
      pushToast({ type: "error", title: "Conta sem email principal para vincular senha." });
      return;
    }
    if (!linkPassword || linkPassword.length < 6) {
      pushToast({ type: "error", title: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (linkPassword !== linkPasswordConfirm) {
      pushToast({ type: "error", title: "As senhas nao coincidem." });
      return;
    }

    setLinkingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, linkPassword);
      await linkWithCredential(user, credential);
      setLinkPassword("");
      setLinkPasswordConfirm("");
      pushToast({ type: "success", title: "Senha vinculada com sucesso." });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao vincular senha", message: error?.message || "" });
    } finally {
      setLinkingPassword(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="text-3xl font-black text-center text-slate-900 mb-10">Minha Conta</h1>

      <Card className="py-12">
        <div className="text-center">
          <h2 className="text-2xl text-slate-900 font-black">{profile.name}</h2>
          <p className="text-slate-500 mt-2">{profile.email}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-4">{profile.role}</p>
        </div>

        <div className="mt-10 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Chave Pix</p>
            <p className="text-sm font-bold text-slate-700 mt-2">{profile.pixKey || "Nao informado"}</p>
          </div>

          {profile.role === "PRESTADOR" ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                Documentos de seguranca
              </p>
              <div className="mt-4 space-y-3">
                {ownSafetyDocs.map((doc) => (
                  <div key={doc.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-black text-slate-800">{doc.title}</p>
                    <p className="mt-2 text-xs text-slate-500">Emissao: {doc.issuedAt}</p>
                    {doc.expiresAt ? <p className="text-xs text-slate-500">Validade: {doc.expiresAt}</p> : null}
                    {doc.externalUrl ? (
                      <a
                        className="mt-2 inline-flex text-xs font-black text-[#1895BD] hover:underline"
                        href={doc.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir documento
                      </a>
                    ) : null}
                    {doc.notes ? <p className="mt-2 text-xs text-slate-500">{doc.notes}</p> : null}
                  </div>
                ))}
                {ownSafetyDocs.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum documento registrado ate o momento.</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {hasGoogleProvider ? (
          <div className="mt-10">
            <h3 className="text-lg font-black text-slate-900 mb-2">Definir senha</h3>
            <p className="text-sm text-slate-500 mb-4">
              Vincule uma senha para entrar tambem com email e senha.
            </p>

            {hasPasswordProvider ? (
              <div className="text-sm text-emerald-600 font-bold">Email/senha ja vinculado a esta conta.</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Nova senha</p>
                  <input
                    type="password"
                    value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                    placeholder="min. 6 caracteres"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
                    Confirmar senha
                  </p>
                  <input
                    type="password"
                    value={linkPasswordConfirm}
                    onChange={(e) => setLinkPasswordConfirm(e.target.value)}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                    placeholder="repita a senha"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={doLinkPassword} disabled={linkingPassword}>
                    {linkingPassword ? "Vinculando..." : "Vincular email/senha"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-12 flex justify-center">
          <Button variant="outline" onClick={logout}>
            Desconectar
          </Button>
        </div>
      </Card>
    </div>
  );
}
