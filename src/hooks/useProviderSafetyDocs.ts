import { Dispatch, useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { ProviderSafetyDoc } from "../types";
import { getLegacySafetyDocsQuery, getUserSafetyDocsQuery, mergeSafetyDocCollections } from "../services/portal";
import { PortalAction } from "../app/providers/portalState";

interface ProviderSafetyDocsArgs {
  selectedProviderUid: string | null;
  pushToast: (payload: { type: "success" | "error" | "info"; title: string; message?: string }) => void;
  dispatch: Dispatch<PortalAction>;
}

export function useProviderSafetyDocs({ selectedProviderUid, pushToast, dispatch }: ProviderSafetyDocsArgs) {
  useEffect(() => {
    if (!selectedProviderUid) {
      dispatch({ type: "setProviderDocs", payload: [] });
      return;
    }

    dispatch({ type: "setProviderDocs", payload: [] });

    let legacyDocs: ProviderSafetyDoc[] = [];
    let nextDocs: ProviderSafetyDoc[] = [];

    const publish = () => {
      dispatch({ type: "setProviderDocs", payload: mergeSafetyDocCollections(legacyDocs, nextDocs) });
    };

    const unsubLegacy = onSnapshot(
      getLegacySafetyDocsQuery(selectedProviderUid),
      (snap) => {
        legacyDocs = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id } as ProviderSafetyDoc));
        publish();
      },
      (error) => {
        console.error("Error loading legacy safety docs:", error);
        pushToast({ type: "error", title: "Erro ao carregar registros do prestador", message: error.message });
      }
    );

    const unsubNext = onSnapshot(
      getUserSafetyDocsQuery(selectedProviderUid),
      (snap) => {
        nextDocs = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id } as ProviderSafetyDoc));
        publish();
      },
      (error) => {
        console.error("Error loading user safety docs:", error);
        pushToast({ type: "error", title: "Erro ao carregar registros do prestador", message: error.message });
      }
    );

    return () => {
      unsubLegacy();
      unsubNext();
    };
  }, [selectedProviderUid, pushToast, dispatch]);
}
