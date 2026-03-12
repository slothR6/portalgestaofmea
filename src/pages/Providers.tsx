import React, { useState } from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { usePortalStore } from "../hooks/usePortalStore";
import { addProviderSafetyDoc, deleteProviderSafetyDoc } from "../services/portal";
import { sanitize } from "../utils/sanitize";
import { isValidDateISO } from "../utils/dates";

export default function ProvidersPage() {
  const { state, actions, profile, pushToast } = usePortalStore();
  const [safetyDocForm, setSafetyDocForm] = useState({
    title: "",
    issuedAt: "",
    expiresAt: "",
    externalUrl: "",
    notes: "",
  });

  const openProvider = (uid: string) => {
    actions.setSelectedProviderUid(uid);
    setSafetyDocForm({ title: "", issuedAt: "", expiresAt: "", externalUrl: "", notes: "" });
  };

  const saveSafetyDoc = async () => {
    if (!profile || !state.selectedProviderUid) return;
    const title = sanitize(safetyDocForm.title);
    const issuedAt = safetyDocForm.issuedAt;

    if (!title) return pushToast({ type: "error", title: "Informe o título do registro" });
    if (!issuedAt || !isValidDateISO(issuedAt)) return pushToast({ type: "error", title: "Informe a data de emissão válida" });
    if (safetyDocForm.expiresAt && !isValidDateISO(safetyDocForm.expiresAt)) {
      return pushToast({ type: "error", title: "Data de validade inválida" });
    }

    try {
      await addProviderSafetyDoc(state.selectedProviderUid, {
        title,
        issuedAt,
        expiresAt: safetyDocForm.expiresAt || "",
        externalUrl: sanitize(safetyDocForm.externalUrl),
        notes: sanitize(safetyDocForm.notes),
        createdAt: Date.now(),
        createdByUid: profile.uid,
        createdByName: profile.name,
      });
      pushToast({ type: "success", title: "Registro adicionado" });
      setSafetyDocForm({ title: "", issuedAt: "", expiresAt: "", externalUrl: "", notes: "" });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao salvar registro", message: error?.message || "" });
    }
  };

  const removeSafetyDoc = async (docId: string) => {
    if (!state.selectedProviderUid) return;
    if (!confirm("Excluir este registro?")) return;
    try {
      await deleteProviderSafetyDoc(state.selectedProviderUid, docId);
      pushToast({ type: "success", title: "Registro removido" });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao remover registro", message: error?.message || "" });
    }
  };

  return (
    <>
      <div>
        <h1 className="text-[#1895BD]">Prestadores</h1>
        <p className="text-gray-400">Cadastro e documentação de segurança (sem upload por enquanto).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1">
          <h3 className="text-xl mb-4">Lista</h3>
          <div className="space-y-2 max-h-[520px] overflow-auto pr-2">
            {state.users
              .filter((u) => u.role === "PRESTADOR" && u.status === "ACTIVE")
              .map((u) => (
                <button
                  key={u.uid}
                  onClick={() => openProvider(u.uid)}
                  className={`w-full text-left p-4 rounded-2xl border transition ${
                    state.selectedProviderUid === u.uid
                      ? "border-[#1895BD] bg-blue-50"
                      : "border-gray-100 hover:bg-gray-50"
                  }`}
                >
                  <p className="font-black text-gray-800">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </button>
              ))}
            {state.users.filter((u) => u.role === "PRESTADOR" && u.status === "ACTIVE").length === 0 ? (
              <div className="py-10 text-center text-gray-300">Sem prestadores ativos.</div>
            ) : null}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          {!state.selectedProviderUid ? (
            <div className="py-16 text-center text-gray-300">Selecione um prestador para ver os registros.</div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h3 className="text-2xl text-gray-800">Registros</h3>
                  <p className="text-gray-500 text-sm">
                    Adicione registros como NR-10, NR-33, NR-35, ASO etc. Por enquanto, use link externo.
                  </p>
                </div>
              </div>

              <div className="mt-6 p-6 border border-gray-100 rounded-2xl">
                <h4 className="font-black text-gray-700 mb-4">Adicionar registro</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    value={safetyDocForm.title}
                    onChange={(e) => setSafetyDocForm((s) => ({ ...s, title: e.target.value }))}
                    className="px-4 py-3 border border-gray-100 rounded-xl"
                    placeholder="Título (ex: NR-35)"
                  />
                  <input
                    type="date"
                    value={safetyDocForm.issuedAt}
                    onChange={(e) => setSafetyDocForm((s) => ({ ...s, issuedAt: e.target.value }))}
                    className="px-4 py-3 border border-gray-100 rounded-xl"
                    placeholder="Emissão"
                  />
                  <input
                    type="date"
                    value={safetyDocForm.expiresAt}
                    onChange={(e) => setSafetyDocForm((s) => ({ ...s, expiresAt: e.target.value }))}
                    className="px-4 py-3 border border-gray-100 rounded-xl"
                    placeholder="Validade (opcional)"
                  />
                  <input
                    value={safetyDocForm.externalUrl}
                    onChange={(e) => setSafetyDocForm((s) => ({ ...s, externalUrl: e.target.value }))}
                    className="px-4 py-3 border border-gray-100 rounded-xl"
                    placeholder="Link externo (Drive/OneDrive)"
                  />
                  <textarea
                    value={safetyDocForm.notes}
                    onChange={(e) => setSafetyDocForm((s) => ({ ...s, notes: e.target.value }))}
                    className="px-4 py-3 border border-gray-100 rounded-xl md:col-span-2"
                    placeholder="Observações (opcional)"
                  />
                </div>

                <div className="mt-4 flex justify-end">
                  <Button onClick={saveSafetyDoc}>Salvar registro</Button>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                {state.providerDocs.map((d) => (
                  <div
                    key={d.id}
                    className="p-5 border border-gray-100 rounded-2xl flex items-start justify-between gap-4"
                  >
                    <div className="flex-1">
                      <p className="font-black text-gray-800">{d.title}</p>
                      <p className="text-sm text-gray-600">Emissão: {d.issuedAt}</p>
                      {d.expiresAt ? <p className="text-sm text-gray-600">Validade: {d.expiresAt}</p> : null}
                      {d.externalUrl ? (
                        <a
                          className="text-sm text-[#1895BD] font-black hover:underline"
                          href={d.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir link
                        </a>
                      ) : null}
                      {d.notes ? <p className="text-sm text-gray-500 mt-2">{d.notes}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => removeSafetyDoc(d.id)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
                {state.providerDocs.length === 0 ? (
                  <div className="py-10 text-center text-gray-300">Nenhum registro ainda.</div>
                ) : null}
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
