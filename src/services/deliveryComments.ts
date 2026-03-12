import { collection, doc, limit, orderBy, query, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { PAGE_SIZE } from "../constants";
import { Comment } from "../types";

export async function createDeliveryComment(deliveryId: string, comment: Comment) {
  await setDoc(doc(db, "deliveries", deliveryId, "comments", comment.id), comment);
}

export function getDeliveryCommentsQuery(deliveryId: string) {
  return query(
    collection(db, "deliveries", deliveryId, "comments"),
    orderBy("createdAt", "asc"),
    limit(PAGE_SIZE * 100)
  );
}

export function mergeDeliveryCommentCollections(...collections: Comment[][]) {
  const byId = new Map<string, Comment>();

  collections.forEach((items) => {
    items.forEach((item) => {
      byId.set(item.id, item);
    });
  });

  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
}
