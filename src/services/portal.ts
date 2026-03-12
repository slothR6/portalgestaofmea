import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Delivery,
  Meeting,
  Project,
  ProviderSafetyDoc,
  UserProfile,
  UserRole,
} from "../types";
import { PAGE_SIZE } from "../constants";

// ---------- USERS ----------
export async function approveUser(uid: string, role: UserRole) {
  await updateDoc(doc(db, "users", uid), {
    role,
    status: "ACTIVE",
    active: true,
    approvedAt: Date.now(),
  });
}

export async function rejectUser(uid: string) {
  await updateDoc(doc(db, "users", uid), {
    status: "REJECTED",
    active: false,
  });
}

export async function softDeleteUser(uid: string) {
  await updateDoc(doc(db, "users", uid), {
    status: "DELETED",
    active: false,
    deletedAt: Date.now(),
  });
}

// ---------- PROJECTS ----------
export async function createProject(payload: Omit<Project, "id">) {
  await addDoc(collection(db, "projects"), payload);
}

export async function updateProject(projectId: string, patch: Partial<Project>) {
  await updateDoc(doc(db, "projects", projectId), {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function deleteProject(projectId: string) {
  const qDel = query(collection(db, "deliveries"), where("projectId", "==", projectId));
  const snap = await getDocs(qDel);
  await Promise.all(snap.docs.map((docSnap) => deleteDelivery(docSnap.id)));
  await deleteDoc(doc(db, "projects", projectId));
}

// ---------- DELIVERIES ----------
export async function createDelivery(payload: Omit<Delivery, "id" | "attachments" | "comments">) {
  const docRef = await addDoc(collection(db, "deliveries"), {
    ...payload,
    attachments: [],
    comments: [],
    externalLinks: [],
  });
  return docRef.id;
}

export async function updateDelivery(deliveryId: string, patch: Partial<Delivery>) {
  await updateDoc(doc(db, "deliveries", deliveryId), patch);
}

export async function deleteDelivery(deliveryId: string) {
  const commentsSnap = await getDocs(collection(db, "deliveries", deliveryId, "comments"));
  const linksSnap = await getDocs(collection(db, "deliveries", deliveryId, "links"));
  const deadlineRequestsSnap = await getDocs(collection(db, "deliveries", deliveryId, "deadlineRequests"));

  await Promise.all([
    ...commentsSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)),
    ...linksSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)),
    ...deadlineRequestsSnap.docs.map((docSnap) => deleteDoc(docSnap.ref)),
  ]);
  await deleteDoc(doc(db, "deliveries", deliveryId));
}

// ---------- MEETINGS ----------
export async function createMeeting(payload: Omit<Meeting, "id">) {
  await addDoc(collection(db, "meetings"), payload);
}

export async function updateMeeting(meetingId: string, patch: Partial<Meeting>) {
  await updateDoc(doc(db, "meetings", meetingId), {
    ...patch,
    updatedAt: Date.now(),
  });
}

// ---------- PROVIDER SAFETY DOCS ----------
export async function addProviderSafetyDoc(
  providerUid: string,
  docPayload: Omit<ProviderSafetyDoc, "id">
) {
  const legacyRef = doc(collection(db, "providers", providerUid, "safetyDocs"));
  const nextRef = doc(db, "users", providerUid, "safetyDocs", legacyRef.id);
  const batch = writeBatch(db);
  batch.set(legacyRef, docPayload);
  batch.set(nextRef, docPayload);
  await batch.commit();
  return legacyRef.id;
}

export async function deleteProviderSafetyDoc(providerUid: string, docId: string) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "providers", providerUid, "safetyDocs", docId));
  batch.delete(doc(db, "users", providerUid, "safetyDocs", docId));
  await batch.commit();
}

export async function getNextProposalSequence(companyId: string) {
  const snap = await getDocs(query(collection(db, "projects"), where("companyId", "==", companyId)));
  let maxSequence = 0;
  snap.docs.forEach((docSnap) => {
    const data = docSnap.data() as any;
    let seq = typeof data.proposalSequence === "number" ? data.proposalSequence : 0;
    if (!seq && typeof data.proposalCode === "string") {
      const match = data.proposalCode.match(/^PR\\d{2}-(\\d+)\\./);
      if (match) {
        const parsed = Number(match[1]);
        if (!Number.isNaN(parsed)) seq = parsed;
      }
    }
    if (seq > maxSequence) maxSequence = seq;
  });
  return maxSequence + 1;
}

// ---------- QUERY HELPERS ----------
export function getBaseUsersQuery(isAdmin: boolean) {
  if (isAdmin) {
    // Admin: busca TODOS os usuários e filtra DELETED no client-side
    // Evita precisar de índice composto adicional
    return query(
      collection(db, "users"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE * 100)
    );
  }
  
  // Prestador: apenas ativos, ordenado por data
  return query(
    collection(db, "users"),
    where("status", "==", "ACTIVE"),
    where("active", "==", true),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE * 50)
  );
}

export function getAdminUsersQuery() {
  return query(
    collection(db, "users"),
    where("role", "==", "ADMIN"),
    where("status", "==", "ACTIVE"),
    where("active", "==", true),
    limit(PAGE_SIZE * 10)
  );
}

export function getBaseProjectsQuery(isAdmin: boolean, uid: string) {
  if (isAdmin) {
    // Admin: todos projetos, ordenado por data
    return query(
      collection(db, "projects"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE * 50)
    );
  }
  
  // Prestador: apenas onde é membro, ordenado por data
  return query(
    collection(db, "projects"),
    where("memberUids", "array-contains", uid),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE * 50)
  );
}

export function getBaseDeliveriesQuery(isAdmin: boolean, uid: string) {
  if (isAdmin) {
    // Admin: todas entregas, ordenado por data
    return query(
      collection(db, "deliveries"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE * 50)
    );
  }
  
  // Prestador: apenas suas entregas, ordenado por data
  return query(
    collection(db, "deliveries"),
    where("providerUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE * 50)
  );
}

export function getLegacySafetyDocsQuery(providerUid: string) {
  return query(
    collection(db, "providers", providerUid, "safetyDocs"),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE * 50)
  );
}

export function getUserSafetyDocsQuery(userUid: string) {
  return query(
    collection(db, "users", userUid, "safetyDocs"),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE * 50)
  );
}

export function mergeSafetyDocCollections(...collections: ProviderSafetyDoc[][]) {
  const byId = new Map<string, ProviderSafetyDoc>();

  collections.forEach((items) => {
    items.forEach((item) => {
      byId.set(item.id, item);
    });
  });

  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function getMeetingsQuery(isAdmin: boolean, uid: string) {
  if (isAdmin) {
    return query(collection(db, "meetings"), orderBy("startsAt", "asc"), limit(PAGE_SIZE * 50));
  }

  return query(collection(db, "meetings"), where("participantUids", "array-contains", uid), limit(PAGE_SIZE * 50));
}
