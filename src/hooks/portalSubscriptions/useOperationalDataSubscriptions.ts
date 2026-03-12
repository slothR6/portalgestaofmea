import { useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { Delivery, Meeting, Project } from "../../types";
import { getBaseDeliveriesQuery, getBaseProjectsQuery, getMeetingsQuery } from "../../services/portal";
import { normalizeDeliveryRecord } from "../../utils/deliveries";
import { normalizeProjectRecord } from "../../utils/projects";
import { PortalSubscriptionsArgs } from "./types";

export function useOperationalDataSubscriptions({
  user,
  profile,
  role,
  pushToast,
  dispatch,
}: PortalSubscriptionsArgs) {
  useEffect(() => {
    if (!user || !profile || !profile.active) return;

    dispatch({ type: "setLoading", payload: { projects: true, deliveries: true, meetings: true } });

    const projectsQ = getBaseProjectsQuery(role === "ADMIN", user.uid);
    const unsubProjects = onSnapshot(
      projectsQ,
      (snap) => {
        const arr = snap.docs
          .map((doc) => normalizeProjectRecord(doc.data() as Record<string, unknown>, doc.id))
          .filter((entry) => !entry.deletedAt)
          .filter(
            (entry) =>
              role === "ADMIN" || (entry.status !== "PROPOSTA" && entry.status !== "RECUSADA")
          );

        dispatch({ type: "setProjects", payload: arr });
        dispatch({ type: "setLoading", payload: { projects: false } });
      },
      (error) => {
        console.error("Error loading projects:", error);
        pushToast({ type: "error", title: "Erro ao carregar projetos", message: error.message });
        dispatch({ type: "setLoading", payload: { projects: false } });
      }
    );

    const deliveriesQ = getBaseDeliveriesQuery(role === "ADMIN", user.uid);
    const unsubDeliveries = onSnapshot(
      deliveriesQ,
      (snap) => {
        const arr = snap.docs
          .map((doc) => normalizeDeliveryRecord(doc.data() as Record<string, unknown>, doc.id))
          .filter((entry) => !entry.deletedAt);
        dispatch({ type: "setDeliveries", payload: arr });
        dispatch({ type: "setLoading", payload: { deliveries: false } });
      },
      (error) => {
        console.error("Error loading deliveries:", error);
        pushToast({ type: "error", title: "Erro ao carregar entregas", message: error.message });
        dispatch({ type: "setLoading", payload: { deliveries: false } });
      }
    );

    const meetingsQ = getMeetingsQuery(role === "ADMIN", user.uid);
    const unsubMeetings = onSnapshot(
      meetingsQ,
      (snap) => {
        const arr = snap.docs.map((doc) => {
          const data = doc.data() as Meeting;
          return { ...data, id: doc.id, status: data.status || "SCHEDULED" } as Meeting;
        });
        dispatch({ type: "setMeetings", payload: arr });
        dispatch({ type: "setLoading", payload: { meetings: false } });
      },
      (error) => {
        console.error("Error loading meetings:", error);
        pushToast({ type: "error", title: "Erro ao carregar reunioes", message: error.message });
        dispatch({ type: "setLoading", payload: { meetings: false } });
      }
    );

    return () => {
      unsubProjects();
      unsubDeliveries();
      unsubMeetings();
    };
  }, [user?.uid, profile?.active, role, pushToast, dispatch]);
}
