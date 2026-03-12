import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import { useAppRouter } from "../app/router/RouterProvider";
import { usePortalStore } from "../hooks/usePortalStore";
import { useDeliveriesState, useUsersState } from "../hooks/usePortalCollections";
import { useDeliveryDetailState } from "../hooks/usePortalDetails";
import { useDeliveryComments } from "../hooks/deliveries/useDeliveryComments";
import { useDeliveryLinks } from "../hooks/deliveries/useDeliveryLinks";
import { useDeliveryDeadlineRequests } from "../hooks/deliveries/useDeliveryDeadlineRequests";
import { createNotification } from "../services/notifications";
import { deleteDelivery, updateDelivery } from "../services/portal";
import { createDeliveryComment } from "../services/deliveryComments";
import { createDeliveryLink, deleteDeliveryLink } from "../services/deliveryLinks";
import { createDeliveryDeadlineRequest, decideDeliveryDeadlineRequest } from "../services/deliveryDeadlineRequests";
import { Comment, Delivery, DeliveryDeadlineRequest, ExternalLink, Status } from "../types";
import { sanitize } from "../utils/sanitize";
import { isValidExternalUrl } from "../utils/urls";
import { isValidDateISO, nowPtBr } from "../utils/dates";

export default function DeliveryDetailPage() {
  const { role, profile, user, pushToast, setView } = usePortalStore();
  const { navigate } = useAppRouter();
  const { deliveries, loadingDeliveries, selectedDeliveryId, setSelectedDeliveryId } = useDeliveriesState();
  const { adminUids } = useUsersState();
  const { deliveryId, selectedDelivery } = useDeliveryDetailState();
  const [commentText, setCommentText] = useState("");
  const [deliveryLinkForm, setDeliveryLinkForm] = useState({ title: "", url: "" });
  const [deadlineRequestForm, setDeadlineRequestForm] = useState({ requestedDeadline: "", reason: "" });
  const [deadlineDecisionNote, setDeadlineDecisionNote] = useState("");
  const deliveryComments = useDeliveryComments(selectedDelivery);
  const deliveryLinks = useDeliveryLinks(selectedDelivery);
  const { requests: deliveryDeadlineRequests, currentRequest } = useDeliveryDeadlineRequests(selectedDelivery);
  const deadlineRequestHistory = useMemo(
    () => deliveryDeadlineRequests.slice(currentRequest ? 1 : 0),
    [deliveryDeadlineRequests, currentRequest]
  );

  useEffect(() => {
    setDeadlineDecisionNote("");
    setDeadlineRequestForm({ requestedDeadline: "", reason: "" });
  }, [deliveryId]);

  useEffect(() => {
    if (!deliveryId || loadingDeliveries || selectedDelivery) return;
    navigate(role === "ADMIN" ? "/admin/deliveries" : "/provider/deliveries", { replace: true });
  }, [deliveryId, loadingDeliveries, selectedDelivery, navigate, role]);

  const notifyAdmins = async (payload: Omit<DeliveryNotificationPayload, "toUid">) => {
    if (!adminUids.length) return;
    await Promise.all(
      adminUids.map((uid) =>
        createNotification({
          ...payload,
          toUid: uid,
        })
      )
    );
  };

  const startDelivery = async (targetDeliveryId: string) => {
    if (!profile || !user || profile.role !== "PRESTADOR") return;

    const delivery = deliveries.find((item) => item.id === targetDeliveryId);
    if (!delivery || delivery.status === "APROVADO" || delivery.progress === "FAZENDO") return;

    try {
      await updateDelivery(targetDeliveryId, { progress: "FAZENDO" });
      pushToast({ type: "success", title: "Entrega iniciada" });

      await notifyAdmins({
        type: "STARTED",
        title: `Entrega em andamento: ${delivery.title}`,
        projectId: delivery.projectId,
        deliveryId: delivery.id,
        createdAt: Date.now(),
        read: false,
      });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao iniciar entrega", message: error?.message || "" });
    }
  };

  const setDeliveryStatus = async (targetDeliveryId: string, newStatus: Status) => {
    if (!profile || !user) return;
    if (profile.role === "PRESTADOR" && newStatus !== "REVISAO") return;
    if (profile.role === "ADMIN" && newStatus === "REVISAO") return;

    const delivery = deliveries.find((item) => item.id === targetDeliveryId);
    if (!delivery) return;

    try {
      const patch: Partial<Delivery> = { status: newStatus };
      if (newStatus === "REVISAO") patch.progress = "REVISAO";
      if (newStatus === "APROVADO") patch.progress = "APROVADO";
      if (newStatus === "AJUSTES") patch.progress = "FAZENDO";
      await updateDelivery(targetDeliveryId, patch);
      pushToast({ type: "success", title: "Status atualizado", message: newStatus });

      if (profile.role === "ADMIN" && newStatus === "AJUSTES" && delivery.providerUid) {
        await createNotification({
          toUid: delivery.providerUid,
          type: "ADJUST_REQUESTED",
          title: `Ajustes solicitados: ${delivery.title}`,
          projectId: delivery.projectId,
          deliveryId: delivery.id,
          createdAt: Date.now(),
          read: false,
        });
      }

      if (profile.role === "ADMIN" && newStatus === "APROVADO" && delivery.providerUid) {
        await createNotification({
          toUid: delivery.providerUid,
          type: "APPROVED",
          title: `Entrega aprovada: ${delivery.title}`,
          projectId: delivery.projectId,
          deliveryId: delivery.id,
          createdAt: Date.now(),
          read: false,
        });
      }

      if (profile.role === "PRESTADOR" && newStatus === "REVISAO") {
        await notifyAdmins({
          type: "SUBMITTED",
          title: `Entrega enviada para revisao: ${delivery.title}`,
          projectId: delivery.projectId,
          deliveryId: delivery.id,
          createdAt: Date.now(),
          read: false,
        });
      }
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao atualizar status", message: error?.message || "" });
    }
  };

  const buildExternalLink = (title: string, url: string): ExternalLink => ({
    id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    url,
    createdAt: Date.now(),
    createdByUid: user?.uid || "",
  });

  const buildComment = (text: string): Comment => ({
    id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    authorUid: user?.uid || "",
    authorName: profile?.name || "",
    date: nowPtBr(),
    text,
    createdAt: Date.now(),
  });

  const addDeliveryLinkToSubcollection = async () => {
    if (!selectedDelivery || !user || !(role === "ADMIN" || role === "PRESTADOR")) return;
    const title = sanitize(deliveryLinkForm.title);
    const url = sanitize(deliveryLinkForm.url);

    if (!title) return pushToast({ type: "error", title: "Informe o titulo do link" });
    if (!url || !isValidExternalUrl(url)) {
      return pushToast({ type: "error", title: "URL invalida (use http:// ou https://)" });
    }

    try {
      await createDeliveryLink(selectedDelivery.id, buildExternalLink(title, url));
      setDeliveryLinkForm({ title: "", url: "" });
      pushToast({ type: "success", title: "Link adicionado a entrega" });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao adicionar link", message: error?.message || "" });
    }
  };

  const removeDeliveryLinkFromSubcollection = async (linkId: string) => {
    if (!selectedDelivery || !user || role !== "ADMIN") return;
    try {
      await deleteDeliveryLink(selectedDelivery.id, linkId);
      pushToast({ type: "success", title: "Link removido da entrega" });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao remover link", message: error?.message || "" });
    }
  };

  const addCommentToSubcollection = async (targetDeliveryId: string) => {
    if (!profile || !user) return;
    const text = sanitize(commentText);
    if (!text) return;

    try {
      const delivery = deliveries.find((item) => item.id === targetDeliveryId);
      if (!delivery) return;

      await createDeliveryComment(targetDeliveryId, buildComment(text));
      setCommentText("");
      pushToast({ type: "success", title: "Comentario publicado" });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao publicar comentario", message: error?.message || "" });
    }
  };

  const submitDeadlineRequest = async (targetDeliveryId: string) => {
    if (!profile || !user || profile.role !== "PRESTADOR") return;

    const delivery = deliveries.find((item) => item.id === targetDeliveryId);
    if (!delivery) return;

    const requestedDeadline = deadlineRequestForm.requestedDeadline;
    const reason = sanitize(deadlineRequestForm.reason);

    if (!requestedDeadline || !isValidDateISO(requestedDeadline)) {
      pushToast({ type: "error", title: "Informe um prazo valido" });
      return;
    }
    if (!reason) {
      pushToast({ type: "error", title: "Informe o motivo da alteracao" });
      return;
    }

    try {
      await createDeliveryDeadlineRequest(targetDeliveryId, {
        requestedDeadline,
        reason,
        requestedAt: Date.now(),
        requestedByUid: user.uid,
        status: "PENDING",
      });

      await notifyAdmins({
        type: "DEADLINE_CHANGE_REQUESTED",
        title: `Solicitacao de prazo: ${delivery.title}`,
        projectId: delivery.projectId,
        deliveryId: delivery.id,
        createdAt: Date.now(),
        read: false,
      });

      setDeadlineRequestForm({ requestedDeadline: "", reason: "" });
      pushToast({ type: "success", title: "Solicitacao enviada" });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao solicitar alteracao", message: error?.message || "" });
    }
  };

  const decideDeadlineRequest = async (
    targetDeliveryId: string,
    request: DeliveryDeadlineRequest,
    decision: "APPROVED" | "REJECTED"
  ) => {
    if (!profile || !user || profile.role !== "ADMIN") return;

    const delivery = deliveries.find((item) => item.id === targetDeliveryId);
    if (!delivery || request.status !== "PENDING") return;

    const adminNote = sanitize(deadlineDecisionNote);

    try {
      await decideDeliveryDeadlineRequest(targetDeliveryId, request, decision, user.uid, adminNote || "");

      if (delivery.providerUid) {
        await createNotification({
          toUid: delivery.providerUid,
          type: decision === "APPROVED" ? "DEADLINE_CHANGE_APPROVED" : "DEADLINE_CHANGE_REJECTED",
          title: decision === "APPROVED" ? `Prazo aprovado: ${delivery.title}` : `Prazo rejeitado: ${delivery.title}`,
          projectId: delivery.projectId,
          deliveryId: delivery.id,
          createdAt: Date.now(),
          read: false,
        });
      }

      setDeadlineDecisionNote("");
      pushToast({
        type: "success",
        title: decision === "APPROVED" ? "Prazo aprovado" : "Solicitacao rejeitada",
      });
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao decidir solicitacao", message: error?.message || "" });
    }
  };

  const removeCurrentDelivery = async (targetDeliveryId: string, title: string) => {
    if (!confirm(`Excluir entrega "${title}"?`)) return;
    try {
      await deleteDelivery(targetDeliveryId);
      pushToast({ type: "success", title: "Entrega excluida" });
      if (selectedDeliveryId === targetDeliveryId) setSelectedDeliveryId(null);
      setView("ENTREGAS");
    } catch (error: any) {
      pushToast({ type: "error", title: "Erro ao excluir entrega", message: error?.message || "" });
    }
  };

  if (!selectedDelivery) return null;

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white px-8 py-6">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setView("ENTREGAS")}
            className="text-xs font-black uppercase tracking-[0.4em] text-slate-200 hover:text-white text-left"
          >
            Voltar
          </button>
          <div>
            <h1 className="text-3xl font-black mb-1">{selectedDelivery.title}</h1>
            <p className="text-slate-200 font-black uppercase text-xs tracking-[0.4em]">{selectedDelivery.project}</p>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          {role === "PRESTADOR" && selectedDelivery.status !== "APROVADO" ? (
            <>
              {selectedDelivery.progress === "A_FAZER" ? (
                <Button variant="outline" onClick={() => startDelivery(selectedDelivery.id)}>
                  Iniciar entrega
                </Button>
              ) : null}
              <Button
                variant="primary"
                disabled={selectedDelivery.status === "REVISAO"}
                onClick={() => setDeliveryStatus(selectedDelivery.id, "REVISAO")}
              >
                {selectedDelivery.status === "REVISAO" ? "Aguardando retorno do gestor" : "Enviar para revisao"}
              </Button>
            </>
          ) : null}

          {role === "ADMIN" && selectedDelivery.status === "REVISAO" ? (
            <>
              <Button variant="primary" onClick={() => setDeliveryStatus(selectedDelivery.id, "APROVADO")}>
                Aprovar
              </Button>
              <Button variant="outline" onClick={() => setDeliveryStatus(selectedDelivery.id, "AJUSTES")}>
                Pedir ajustes
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <h3 className="text-xl mb-3">Escopo</h3>
            <p className="text-gray-700">{selectedDelivery.description || "Sem descricao."}</p>
          </Card>

          <Card>
            <h3 className="text-xl mb-4">Links</h3>
            <div className="space-y-3">
              {deliveryLinks.map((link) => (
                <div
                  key={link.id}
                  className="p-4 border border-gray-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 truncate">{link.title}</p>
                    <p className="text-xs text-gray-400 truncate">{link.url}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      className="text-xs font-black uppercase tracking-widest text-[#1895BD] hover:underline"
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir
                    </a>
                    {role === "ADMIN" ? (
                      <Button variant="outline" onClick={() => removeDeliveryLinkFromSubcollection(link.id)}>
                        Remover
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
              {deliveryLinks.length === 0 ? (
                <div className="py-6 text-center text-gray-300">Nenhum link adicionado.</div>
              ) : null}
            </div>

            {role === "ADMIN" || role === "PRESTADOR" ? (
              <div className="mt-6 p-5 border border-gray-100 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Adicionar link</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    value={deliveryLinkForm.title}
                    onChange={(event) => setDeliveryLinkForm((form) => ({ ...form, title: event.target.value }))}
                    className="px-4 py-3 border border-gray-100 rounded-xl"
                    placeholder="Titulo"
                  />
                  <input
                    value={deliveryLinkForm.url}
                    onChange={(event) => setDeliveryLinkForm((form) => ({ ...form, url: event.target.value }))}
                    className="px-4 py-3 border border-gray-100 rounded-xl"
                    placeholder="https://..."
                  />
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={addDeliveryLinkToSubcollection}>Adicionar link</Button>
                </div>
              </div>
            ) : null}
          </Card>

          <Card>
            <h3 className="text-xl mb-4">Comentarios</h3>

            <div className="space-y-4">
              {deliveryComments.map((comment) => (
                <div key={comment.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-black text-[#1895BD] uppercase tracking-widest">{comment.authorName}</p>
                    <p className="text-[10px] font-black text-gray-300">{comment.date}</p>
                  </div>
                  <p className="text-gray-700">{comment.text}</p>
                </div>
              ))}

              {deliveryComments.length === 0 ? (
                <div className="py-8 text-center text-gray-300">Nenhum comentario ainda.</div>
              ) : null}
            </div>

            <div className="pt-4">
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Adicionar comentario..."
                className="w-full bg-white border-2 border-gray-100 rounded-2xl p-4 min-h-[120px] outline-none focus:border-[#1895BD]"
              />
              <div className="flex justify-end mt-3">
                <Button onClick={() => addCommentToSubcollection(selectedDelivery.id)}>Publicar</Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white border-0">
            <h3 className="text-xl mb-6">Gestao</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Status</span>
                <Badge type="status" value={selectedDelivery.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Progresso</span>
                <Badge type="status" value={selectedDelivery.progress} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Prioridade</span>
                <Badge type="priority" value={selectedDelivery.priority} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Prestador</span>
                <span className="text-sm font-black">{selectedDelivery.provider}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Prazo</span>
                <span className="text-sm font-black">{selectedDelivery.deadline}</span>
              </div>
            </div>
          </Card>

          {role === "ADMIN" ? (
            <Card>
              <h3 className="text-xl mb-4">Acoes</h3>
              <Button
                variant="danger"
                className="w-full"
                onClick={() => removeCurrentDelivery(selectedDelivery.id, selectedDelivery.title)}
              >
                Excluir entrega
              </Button>
            </Card>
          ) : null}

          <Card>
            <h3 className="text-xl mb-4">Alteracao de prazo</h3>
            {currentRequest ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">Solicitado</p>
                  <p className="text-sm font-bold text-gray-700">{currentRequest.requestedDeadline}</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-400">Motivo</p>
                  <p className="text-sm text-gray-700">{currentRequest.reason}</p>
                </div>
                <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-gray-400">
                  <span>Status</span>
                  <span>{currentRequest.status}</span>
                </div>
                {currentRequest.status !== "PENDING" ? (
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Decisao</p>
                    <p className="text-sm text-gray-700">{currentRequest.adminNote || "Sem observacoes."}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhuma solicitacao registrada.</p>
            )}

            {deadlineRequestHistory.length > 0 ? (
              <div className="mt-5 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">Historico</p>
                {deadlineRequestHistory.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-bold text-gray-700">{request.requestedDeadline}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{request.status}</p>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{request.reason}</p>
                    {request.adminNote ? <p className="mt-2 text-xs text-gray-500">{request.adminNote}</p> : null}
                  </div>
                ))}
              </div>
            ) : null}

            {role === "PRESTADOR" && selectedDelivery.status !== "APROVADO" ? (
              <>
                {currentRequest?.status === "PENDING" ? (
                  <p className="mt-4 text-xs font-black uppercase tracking-widest text-orange-400">
                    Solicitacao pendente de avaliacao.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    <input
                      type="date"
                      value={deadlineRequestForm.requestedDeadline}
                      onChange={(event) =>
                        setDeadlineRequestForm((form) => ({ ...form, requestedDeadline: event.target.value }))
                      }
                      className="w-full px-4 py-3 border border-gray-100 rounded-xl"
                    />
                    <textarea
                      value={deadlineRequestForm.reason}
                      onChange={(event) => setDeadlineRequestForm((form) => ({ ...form, reason: event.target.value }))}
                      className="w-full bg-white border-2 border-gray-100 rounded-2xl p-4 min-h-[90px] outline-none focus:border-[#1895BD]"
                      placeholder="Explique o motivo do ajuste."
                    />
                    <div className="flex justify-end">
                      <Button onClick={() => submitDeadlineRequest(selectedDelivery.id)}>Solicitar alteracao</Button>
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {role === "ADMIN" && currentRequest?.status === "PENDING" ? (
              <div className="mt-4 space-y-3">
                <textarea
                  value={deadlineDecisionNote}
                  onChange={(event) => setDeadlineDecisionNote(event.target.value)}
                  className="w-full bg-white border-2 border-gray-100 rounded-2xl p-4 min-h-[80px] outline-none focus:border-[#1895BD]"
                  placeholder="Observacoes para o prestador (opcional)."
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => decideDeadlineRequest(selectedDelivery.id, currentRequest, "REJECTED")}
                  >
                    Rejeitar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => decideDeadlineRequest(selectedDelivery.id, currentRequest, "APPROVED")}
                  >
                    Aprovar
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>

          <Card>
            <h3 className="text-xl mb-2">Arquivos</h3>
            <p className="text-sm text-gray-500">
              Upload desativado no MVP (Storage pago). Por enquanto, use links nos comentarios.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

interface DeliveryNotificationPayload {
  type:
    | "COMMENT"
    | "SUBMITTED"
    | "APPROVED"
    | "ADJUST_REQUESTED"
    | "MEETING"
    | "NEW_DELIVERY"
    | "STARTED"
    | "DEADLINE_CHANGE_REQUESTED"
    | "DEADLINE_CHANGE_APPROVED"
    | "DEADLINE_CHANGE_REJECTED";
  title: string;
  projectId?: string;
  deliveryId?: string;
  createdAt: number;
  read: boolean;
}
