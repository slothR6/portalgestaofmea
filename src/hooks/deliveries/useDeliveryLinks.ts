import { useEffect, useMemo, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { getDeliveryLinksQuery, mergeDeliveryLinkCollections } from "../../services/deliveryLinks";
import { Delivery, ExternalLink } from "../../types";

export function useDeliveryLinks(delivery: Delivery | null) {
  const [subcollectionLinks, setSubcollectionLinks] = useState<ExternalLink[]>([]);

  useEffect(() => {
    if (!delivery?.id) {
      setSubcollectionLinks([]);
      return;
    }

    setSubcollectionLinks([]);

    const unsubscribe = onSnapshot(
      getDeliveryLinksQuery(delivery.id),
      (snapshot) => {
        setSubcollectionLinks(
          snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as Omit<ExternalLink, "id">),
            id: docSnap.id,
          }))
        );
      },
      (error) => {
        console.error("Error loading delivery links:", error);
      }
    );

    return () => unsubscribe();
  }, [delivery?.id]);

  return useMemo(
    () => mergeDeliveryLinkCollections(delivery?.externalLinks || [], subcollectionLinks),
    [delivery?.externalLinks, subcollectionLinks]
  );
}
