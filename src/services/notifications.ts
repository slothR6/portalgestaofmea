import { addDoc, collection, deleteDoc, doc, orderBy, query, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { AppNotification } from "../types";

export function getNotificationsQuery(uid: string) {
  return query(collection(db, "notifications"), where("toUid", "==", uid), orderBy("createdAt", "desc"));
}

export async function createNotification(payload: Omit<AppNotification, "id">) {
  return addDoc(collection(db, "notifications"), payload);
}

export async function markNotificationRead(notificationId: string) {
  return updateDoc(doc(db, "notifications", notificationId), { read: true });
}

export async function markNotificationsRead(notificationIds: string[]) {
  return Promise.all(notificationIds.map((id) => updateDoc(doc(db, "notifications", id), { read: true })));
}

export async function deleteNotification(notificationId: string) {
  return deleteDoc(doc(db, "notifications", notificationId));
}
