import { collection, doc, limit, orderBy, query, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import { PAGE_SIZE } from "../constants";
import { DeliveryDeadlineRequest, DeliveryDeadlineRequestStatus } from "../types";

function isPendingRequest(request?: DeliveryDeadlineRequest | null) {
  return request?.status === "PENDING";
}

export function buildLegacyDeadlineRequestId(request: Omit<DeliveryDeadlineRequest, "id"> | DeliveryDeadlineRequest) {
  if ("id" in request && request.id) return request.id;
  return `legacy_${request.requestedAt}_${request.requestedByUid}_${request.requestedDeadline}`;
}

export function normalizeLegacyDeadlineRequest(request?: DeliveryDeadlineRequest | null) {
  if (!request) return [];
  return [{ ...request, id: buildLegacyDeadlineRequestId(request) }];
}

export function getDeliveryDeadlineRequestsQuery(deliveryId: string) {
  return query(
    collection(db, "deliveries", deliveryId, "deadlineRequests"),
    orderBy("requestedAt", "desc"),
    limit(PAGE_SIZE * 50)
  );
}

export function mergeDeliveryDeadlineRequestCollections(
  legacyRequest: DeliveryDeadlineRequest | null | undefined,
  nextRequests: DeliveryDeadlineRequest[]
) {
  const byId = new Map<string, DeliveryDeadlineRequest>();

  normalizeLegacyDeadlineRequest(legacyRequest).forEach((request) => {
    byId.set(request.id, request);
  });

  nextRequests.forEach((request) => {
    byId.set(request.id, request);
  });

  return [...byId.values()].sort((a, b) => b.requestedAt - a.requestedAt);
}

export async function createDeliveryDeadlineRequest(
  deliveryId: string,
  payload: Omit<DeliveryDeadlineRequest, "id">
) {
  const requestRef = doc(collection(db, "deliveries", deliveryId, "deadlineRequests"));
  const request: DeliveryDeadlineRequest = {
    ...payload,
    id: requestRef.id,
  };
  const deliveryRef = doc(db, "deliveries", deliveryId);

  await runTransaction(db, async (transaction) => {
    const deliverySnap = await transaction.get(deliveryRef);
    if (!deliverySnap.exists()) {
      throw new Error("Entrega nao encontrada.");
    }

    const currentRequest = (deliverySnap.data().deadlineChangeRequest || null) as DeliveryDeadlineRequest | null;
    if (isPendingRequest(currentRequest)) {
      throw new Error("Ja existe uma solicitacao de prazo pendente.");
    }

    const normalizedCurrentRequest = currentRequest
      ? { ...currentRequest, id: buildLegacyDeadlineRequestId(currentRequest) }
      : null;

    if (normalizedCurrentRequest?.id.startsWith("legacy_")) {
      transaction.set(
        doc(db, "deliveries", deliveryId, "deadlineRequests", normalizedCurrentRequest.id),
        normalizedCurrentRequest
      );
    }

    transaction.set(requestRef, request);
  });

  return request;
}

export async function decideDeliveryDeadlineRequest(
  deliveryId: string,
  request: DeliveryDeadlineRequest,
  decision: Exclude<DeliveryDeadlineRequestStatus, "PENDING">,
  decidedByUid: string,
  adminNote: string
) {
  const deliveryRef = doc(db, "deliveries", deliveryId);
  const requestRef = doc(db, "deliveries", deliveryId, "deadlineRequests", request.id);

  await runTransaction(db, async (transaction) => {
    const deliverySnap = await transaction.get(deliveryRef);
    if (!deliverySnap.exists()) {
      throw new Error("Entrega nao encontrada.");
    }

    const requestSnap = await transaction.get(requestRef);
    const baseRequest = requestSnap.exists()
      ? ({
          ...(requestSnap.data() as Omit<DeliveryDeadlineRequest, "id">),
          id: requestSnap.id,
        } as DeliveryDeadlineRequest)
      : request;

    if (baseRequest.status !== "PENDING") {
      throw new Error("A solicitacao selecionada nao esta mais pendente.");
    }

    const decidedRequest: DeliveryDeadlineRequest = {
      ...baseRequest,
      status: decision,
      decidedAt: Date.now(),
      decidedByUid,
      adminNote,
    };

    transaction.set(requestRef, decidedRequest);
    transaction.update(deliveryRef, {
      ...(decision === "APPROVED" ? { deadline: baseRequest.requestedDeadline } : {}),
    });
  });
}
