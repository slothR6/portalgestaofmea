import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { getLegacySafetyDocsQuery, getUserSafetyDocsQuery, mergeSafetyDocCollections } from "../services/portal";
import { ProviderSafetyDoc } from "../types";

export function useOwnSafetyDocs(uid: string | null) {
  const [docs, setDocs] = useState<ProviderSafetyDoc[]>([]);

  useEffect(() => {
    if (!uid) {
      setDocs([]);
      return;
    }

    setDocs([]);

    let legacyDocs: ProviderSafetyDoc[] = [];
    let nextDocs: ProviderSafetyDoc[] = [];

    const publish = () => {
      setDocs(mergeSafetyDocCollections(legacyDocs, nextDocs));
    };

    const unsubLegacy = onSnapshot(
      getLegacySafetyDocsQuery(uid),
      (snapshot) => {
        legacyDocs = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as Omit<ProviderSafetyDoc, "id">),
          id: docSnap.id,
        }));
        publish();
      },
      (error) => {
        if (error.code !== "permission-denied") {
          console.error("Error loading legacy safety docs:", error);
        }
      }
    );

    const unsubNext = onSnapshot(
      getUserSafetyDocsQuery(uid),
      (snapshot) => {
        nextDocs = snapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as Omit<ProviderSafetyDoc, "id">),
          id: docSnap.id,
        }));
        publish();
      },
      (error) => {
        if (error.code !== "permission-denied") {
          console.error("Error loading user safety docs:", error);
        }
      }
    );

    return () => {
      unsubLegacy();
      unsubNext();
    };
  }, [uid]);

  return docs;
}
