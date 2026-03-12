import { useEffect, useMemo, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { getDeliveryCommentsQuery, mergeDeliveryCommentCollections } from "../../services/deliveryComments";
import { Comment, Delivery } from "../../types";

export function useDeliveryComments(delivery: Delivery | null) {
  const [subcollectionComments, setSubcollectionComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (!delivery?.id) {
      setSubcollectionComments([]);
      return;
    }

    setSubcollectionComments([]);

    const unsubscribe = onSnapshot(
      getDeliveryCommentsQuery(delivery.id),
      (snapshot) => {
        setSubcollectionComments(
          snapshot.docs.map((docSnap) => ({
            ...(docSnap.data() as Omit<Comment, "id">),
            id: docSnap.id,
          }))
        );
      },
      (error) => {
        console.error("Error loading delivery comments:", error);
      }
    );

    return () => unsubscribe();
  }, [delivery?.id]);

  return useMemo(
    () => mergeDeliveryCommentCollections(delivery?.comments || [], subcollectionComments),
    [delivery?.comments, subcollectionComments]
  );
}
