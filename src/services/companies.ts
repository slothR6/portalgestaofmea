import {
  addDoc,
  collection,
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
import { Company, CompanyContact } from "../types";
import { PAGE_SIZE } from "../constants";

export async function createCompany(payload: Omit<Company, "id">) {
  const docRef = await addDoc(collection(db, "companies"), payload);
  return docRef.id;
}

export async function getNextCompanyNumber() {
  const snap = await getDocs(collection(db, "companies"));
  let maxNumber = 0;
  snap.docs.forEach((docSnap) => {
    const data = docSnap.data() as Company;
    const value = typeof data.companyNumber === "number" ? data.companyNumber : 0;
    if (value > maxNumber) maxNumber = value;
  });
  return maxNumber + 1;
}

export async function updateCompany(companyId: string, patch: Partial<Company>) {
  await updateDoc(doc(db, "companies", companyId), {
    ...patch,
  });
}

export async function softDeleteCompany(companyId: string) {
  await updateDoc(doc(db, "companies", companyId), {
    deletedAt: Date.now(),
  });
}

export function getCompaniesQuery() {
  return query(
    collection(db, "companies"),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE * 50)
  );
}

export function getCompanyContactsQuery(companyId: string) {
  return query(
    collection(db, "companies", companyId, "contacts"),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE * 20)
  );
}

export async function createCompanyContact(companyId: string, payload: Omit<CompanyContact, "id">) {
  const contactsRef = collection(db, "companies", companyId, "contacts");
  const contactRef = doc(contactsRef);
  const batch = writeBatch(db);

  if (payload.isPrimary) {
    const primaryContacts = await getDocs(
      query(contactsRef, where("isPrimary", "==", true), limit(PAGE_SIZE * 5))
    );
    primaryContacts.docs.forEach((contactDoc) => {
      batch.update(contactDoc.ref, { isPrimary: false, updatedAt: Date.now() });
    });
  }

  batch.set(contactRef, payload);
  await batch.commit();
  return contactRef.id;
}

export async function updateCompanyContact(companyId: string, contactId: string, patch: Partial<CompanyContact>) {
  const contactsRef = collection(db, "companies", companyId, "contacts");
  const contactRef = doc(db, "companies", companyId, "contacts", contactId);
  const batch = writeBatch(db);

  if (patch.isPrimary) {
    const primaryContacts = await getDocs(
      query(contactsRef, where("isPrimary", "==", true), limit(PAGE_SIZE * 5))
    );
    primaryContacts.docs.forEach((contactDoc) => {
      if (contactDoc.id !== contactId) {
        batch.update(contactDoc.ref, { isPrimary: false, updatedAt: Date.now() });
      }
    });
  }

  batch.update(contactRef, {
    ...patch,
    updatedAt: Date.now(),
  });
  await batch.commit();
}
