import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { CompanyContact } from "../../types";
import { getCompanyContactsQuery } from "../../services/companies";

interface UseCompanyContactsArgs {
  companyId: string | null;
  onError?: (message: string) => void;
}

export function useCompanyContacts({ companyId, onError }: UseCompanyContactsArgs) {
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  useEffect(() => {
    if (!companyId) {
      setContacts([]);
      setLoadingContacts(false);
      return;
    }

    setLoadingContacts(true);
    const contactsQuery = getCompanyContactsQuery(companyId);
    const unsubscribe = onSnapshot(
      contactsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((contactDoc) => ({
          ...(contactDoc.data() as Omit<CompanyContact, "id">),
          id: contactDoc.id,
        }));
        setContacts(items);
        setLoadingContacts(false);
      },
      (error) => {
        console.error("Error loading company contacts:", error);
        onError?.(error.message);
        setLoadingContacts(false);
      }
    );

    return () => unsubscribe();
  }, [companyId, onError]);

  return {
    contacts,
    loadingContacts,
  };
}
