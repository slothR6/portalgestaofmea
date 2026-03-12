import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { AppNotification } from "../types";

export function getLegacyNotificationsQuery(uid: string) {
  return query(collection(db, "notifications"), where("toUid", "==", uid), orderBy("createdAt", "desc"));
}

export function getUserNotificationsQuery(uid: string) {
  return query(collection(db, "users", uid, "notifications"), orderBy("createdAt", "desc"));
}

function getLegacyNotificationRef(notificationId: string) {
  return doc(db, "notifications", notificationId);
}

function getUserNotificationRef(uid: string, notificationId: string) {
  return doc(db, "users", uid, "notifications", notificationId);
}

function getCurrentUid() {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Usuario nao autenticado");
  }
  return uid;
}

export function mergeNotificationCollections(...collections: AppNotification[][]) {
  const merged = new Map<string, AppNotification>();

  collections.forEach((items) => {
    items.forEach((notification) => {
      if (!notification?.id) return;
      merged.set(notification.id, notification);
    });
  });

  return Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export async function createNotification(payload: Omit<AppNotification, "id">) {
  const notificationId = doc(collection(db, "notifications")).id;
  const batch = writeBatch(db);
  const legacyRef = getLegacyNotificationRef(notificationId);
  const userRef = getUserNotificationRef(payload.toUid, notificationId);

  batch.set(legacyRef, payload);
  batch.set(userRef, payload);
  await batch.commit();

  return notificationId;
}

export async function markNotificationRead(notificationId: string) {
  const uid = getCurrentUid();
  const legacyRef = getLegacyNotificationRef(notificationId);
  const userRef = getUserNotificationRef(uid, notificationId);
  const [legacySnap, userSnap] = await Promise.all([getDoc(legacyRef), getDoc(userRef)]);
  const writes: Promise<unknown>[] = [];

  if (legacySnap.exists()) {
    writes.push(updateDoc(legacyRef, { read: true }));
  }
  if (userSnap.exists()) {
    writes.push(updateDoc(userRef, { read: true }));
  }

  if (writes.length === 0) {
    throw new Error("Notificacao nao encontrada");
  }

  return Promise.all(writes);
}

export async function markNotificationsRead(notificationIds: string[]) {
  return Promise.all(notificationIds.map((id) => markNotificationRead(id)));
}

export async function deleteNotification(notificationId: string) {
  const uid = getCurrentUid();
  const legacyRef = getLegacyNotificationRef(notificationId);
  const userRef = getUserNotificationRef(uid, notificationId);
  const [legacySnap, userSnap] = await Promise.all([getDoc(legacyRef), getDoc(userRef)]);
  const writes: Promise<unknown>[] = [];

  if (legacySnap.exists()) {
    writes.push(deleteDoc(legacyRef));
  }
  if (userSnap.exists()) {
    writes.push(deleteDoc(userRef));
  }

  if (writes.length === 0) {
    throw new Error("Notificacao nao encontrada");
  }

  return Promise.all(writes);
}
