import { collection, deleteDoc, doc, limit, orderBy, query, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { PAGE_SIZE } from "../constants";
import { ExternalLink } from "../types";

export async function createDeliveryLink(deliveryId: string, link: ExternalLink) {
  await setDoc(doc(db, "deliveries", deliveryId, "links", link.id), link);
}

export async function deleteDeliveryLink(deliveryId: string, linkId: string) {
  await deleteDoc(doc(db, "deliveries", deliveryId, "links", linkId));
}

export function getDeliveryLinksQuery(deliveryId: string) {
  return query(
    collection(db, "deliveries", deliveryId, "links"),
    orderBy("createdAt", "asc"),
    limit(PAGE_SIZE * 100)
  );
}

export function mergeDeliveryLinkCollections(...collections: ExternalLink[][]) {
  const byId = new Map<string, ExternalLink>();

  collections.forEach((items) => {
    items.forEach((item) => {
      byId.set(item.id, item);
    });
  });

  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
}
