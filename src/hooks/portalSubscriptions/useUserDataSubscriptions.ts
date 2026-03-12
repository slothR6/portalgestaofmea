import { useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import {
  getLegacyNotificationsQuery,
  getUserNotificationsQuery,
  mergeNotificationCollections,
} from "../../services/notifications";
import { AppNotification } from "../../types";
import { PortalSubscriptionsArgs } from "./types";

export function useUserDataSubscriptions({ user, profile, pushToast, dispatch }: PortalSubscriptionsArgs) {
  useEffect(() => {
    if (!user || !profile || !profile.active) {
      dispatch({ type: "setNotifications", payload: [] });
      return;
    }

    let legacyNotifications: AppNotification[] = [];
    let userNotifications: AppNotification[] = [];

    const publishMerged = () => {
      dispatch({
        type: "setNotifications",
        payload: mergeNotificationCollections(legacyNotifications, userNotifications),
      });
    };

    const legacyQ = getLegacyNotificationsQuery(user.uid);
    const userQ = getUserNotificationsQuery(user.uid);

    const unsubLegacyNotifications = onSnapshot(
      legacyQ,
      (snap) => {
        legacyNotifications = snap.docs.map((doc) => ({
          ...(doc.data() as Omit<AppNotification, "id">),
          id: doc.id,
        }));
        publishMerged();
      },
      (error) => {
        console.error("Error loading legacy notifications:", error);
        pushToast({ type: "error", title: "Erro ao carregar notificacoes", message: error.message });
      }
    );

    const unsubUserNotifications = onSnapshot(
      userQ,
      (snap) => {
        userNotifications = snap.docs.map((doc) => ({
          ...(doc.data() as Omit<AppNotification, "id">),
          id: doc.id,
        }));
        publishMerged();
      },
      (error) => {
        console.error("Error loading user notifications:", error);
        pushToast({ type: "error", title: "Erro ao carregar notificacoes", message: error.message });
      }
    );

    return () => {
      unsubLegacyNotifications();
      unsubUserNotifications();
    };
  }, [user?.uid, profile?.active, pushToast, dispatch]);
}
