import { useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { ProviderSafetyDoc } from "../types";
import { getSafetyDocsQuery } from "../services/portal";
import { PortalAction } from "../app/providers/PortalProvider";

interface ProviderSafetyDocsArgs {
  selectedProviderUid: string | null;
  pushToast: (payload: { type: "success" | "error" | "info"; title: string; message?: string }) => void;
  dispatch: React.Dispatch<PortalAction>;
}

export function useProviderSafetyDocs({ selectedProviderUid, pushToast, dispatch }: ProviderSafetyDocsArgs) {
  useEffect(() => {
    if (!selectedProviderUid) {
      dispatch({ type: "setProviderDocs", payload: [] });
      return;
    }

    const qDocs = getSafetyDocsQuery(selectedProviderUid);
    const unsub = onSnapshot(
      qDocs,
      (snap) => {
        const arr = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id } as ProviderSafetyDoc));
        dispatch({ type: "setProviderDocs", payload: arr });
      },
      (error) => {
        console.error("Error loading safety docs:", error);
        pushToast({ type: "error", title: "Erro ao carregar registros do prestador", message: error.message });
      }
    );

    return () => unsub();
  }, [selectedProviderUid, pushToast, dispatch]);
}
