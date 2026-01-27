import { addDoc, collection, doc, getDocs, limit, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Company } from "../types";
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
