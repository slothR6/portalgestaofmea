import { addDoc, collection, doc, limit, orderBy, query, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { Opportunity } from "../types";
import { PAGE_SIZE } from "../constants";

export async function createOpportunity(payload: Omit<Opportunity, "id">) {
  const docRef = await addDoc(collection(db, "opportunities"), payload);
  return docRef.id;
}

export async function updateOpportunity(opportunityId: string, patch: Partial<Opportunity>) {
  await updateDoc(doc(db, "opportunities", opportunityId), {
    ...patch,
    updatedAt: Date.now(),
  });
}

export function getOpportunitiesQuery() {
  return query(
    collection(db, "opportunities"),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE * 50)
  );
}

export function getCompanyOpportunitiesQuery(companyId: string) {
  return query(
    collection(db, "opportunities"),
    where("companyId", "==", companyId),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE * 20)
  );
}
