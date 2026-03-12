import { useEffect, useMemo, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import {
  getDeliveryDeadlineRequestsQuery,
  mergeDeliveryDeadlineRequestCollections,
} from "../../services/deliveryDeadlineRequests";
import { Delivery, DeliveryDeadlineRequest } from "../../types";

export function useDeliveryDeadlineRequests(delivery: Delivery | null) {
  const [subcollectionRequests, setSubcollectionRequests] = useState<DeliveryDeadlineRequest[]>([]);

  useEffect(() => {
    if (!delivery?.id) {
      setSubcollectionRequests([]);
      return;
    }

    setSubcollectionRequests([]);

    const unsubscribe = onSnapshot(
      getDeliveryDeadlineRequestsQuery(delivery.id),
      (snapshot) => {
        setSubcollectionRequests(
          snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as Omit<DeliveryDeadlineRequest, "id">),
            id: docSnap.id,
          }))
        );
      },
      (error) => {
        console.error("Error loading delivery deadline requests:", error);
      }
    );

    return () => unsubscribe();
  }, [delivery?.id]);

  const requests = useMemo(
    () => mergeDeliveryDeadlineRequestCollections(delivery?.deadlineChangeRequest, subcollectionRequests),
    [delivery?.deadlineChangeRequest, subcollectionRequests]
  );

  return {
    requests,
    currentRequest: requests[0] || null,
  };
}
