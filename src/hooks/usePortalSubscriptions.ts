import { useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { Company, Delivery, Meeting, UserProfile, UserRole } from "../types";
import {
  getAdminUsersQuery,
  getBaseDeliveriesQuery,
  getBaseProjectsQuery,
  getBaseUsersQuery,
  getMeetingsQuery,
} from "../services/portal";
import { getCompaniesQuery } from "../services/companies";
import { getNotificationsQuery } from "../services/notifications";
import { resolveProgress } from "../utils/deliveries";
import { PortalAction } from "../app/providers/PortalProvider";

interface PortalSubscriptionsArgs {
  user: { uid: string } | null;
  profile: UserProfile | null;
  role: UserRole | null;
  pushToast: (payload: { type: "success" | "error" | "info"; title: string; message?: string }) => void;
  dispatch: React.Dispatch<PortalAction>;
}

export function usePortalSubscriptions({ user, profile, role, pushToast, dispatch }: PortalSubscriptionsArgs) {
  useEffect(() => {
    if (!user || !profile || !profile.active) return;

    dispatch({ type: "setLoading", payload: { projects: true, deliveries: true, meetings: true } });
    dispatch({ type: "setLoading", payload: { users: role === "ADMIN", companies: role === "ADMIN" } });

    let unsubUsers = () => {};
    if (role === "ADMIN") {
      const usersQ = getBaseUsersQuery(true);
      unsubUsers = onSnapshot(
        usersQ,
        (snap) => {
          const arr = snap.docs
            .map((d) => d.data() as UserProfile)
            .filter((u) => u.status !== "DELETED");
          dispatch({ type: "setUsers", payload: arr });
          dispatch({ type: "setLoading", payload: { users: false } });
        },
        (error) => {
          console.error("Error loading users:", error);
          pushToast({ type: "error", title: "Erro ao carregar usuários", message: error.message });
          dispatch({ type: "setLoading", payload: { users: false } });
        }
      );
    } else {
      dispatch({ type: "setUsers", payload: [] });
      dispatch({ type: "setLoading", payload: { users: false } });
    }

    const adminUsersQ = getAdminUsersQuery();
    const unsubAdmins = onSnapshot(
      adminUsersQ,
      (snap) => {
        const arr = snap.docs.map((d) => d.data() as UserProfile);
        dispatch({ type: "setAdminUids", payload: arr.map((u) => u.uid) });
      },
      (error) => {
        console.error("Error loading admin users:", error);
        pushToast({ type: "error", title: "Erro ao carregar administradores", message: error.message });
      }
    );

    let unsubCompanies = () => {};
    if (role === "ADMIN") {
      const companiesQ = getCompaniesQuery();
      unsubCompanies = onSnapshot(
        companiesQ,
        (snap) => {
          const arr = snap.docs
            .map((d) => ({ ...(d.data() as Company), id: d.id }))
            .filter((c) => !c.deletedAt);
          dispatch({ type: "setCompanies", payload: arr });
          dispatch({ type: "setLoading", payload: { companies: false } });
        },
        (error) => {
          console.error("Error loading companies:", error);
          pushToast({ type: "error", title: "Erro ao carregar empresas", message: error.message });
          dispatch({ type: "setLoading", payload: { companies: false } });
        }
      );
    } else {
      dispatch({ type: "setCompanies", payload: [] });
      dispatch({ type: "setLoading", payload: { companies: false } });
    }

    const projectsQ = getBaseProjectsQuery(role === "ADMIN", user.uid);
    const unsubProjects = onSnapshot(
      projectsQ,
      (snap) => {
        console.log("Projects loaded:", snap.size, "docs for user:", user.uid, "role:", role);
        const arr = snap.docs
          .map((d) => {
            const data = d.data() as any;
            return {
              ...data,
              id: d.id,
              companyName: data.companyName || data.client || "Empresa não definida",
              companyId: data.companyId || "",
            };
          })
          .filter((p) => !p.deletedAt);
        console.log("Projects after filter:", arr);
        dispatch({ type: "setProjects", payload: arr });
        dispatch({ type: "setLoading", payload: { projects: false } });
      },
      (error) => {
        console.error("Error loading projects:", error);
        console.error("User uid:", user.uid, "Role:", role);
        pushToast({ type: "error", title: "Erro ao carregar projetos", message: error.message });
        dispatch({ type: "setLoading", payload: { projects: false } });
      }
    );

    const deliveriesQ = getBaseDeliveriesQuery(role === "ADMIN", user.uid);
    const unsubDeliveries = onSnapshot(
      deliveriesQ,
      (snap) => {
        const arr = snap.docs
          .map((d) => {
            const data = d.data() as Delivery;
            return {
              ...data,
              id: d.id,
              progress: resolveProgress(data.status, data.progress),
            } as Delivery;
          })
          .filter((d) => !d.deletedAt);
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
        const arr = snap.docs.map((d) => {
          const data = d.data() as Meeting;
          return { ...data, id: d.id, status: data.status || "SCHEDULED" } as Meeting;
        });
        dispatch({ type: "setMeetings", payload: arr });
        dispatch({ type: "setLoading", payload: { meetings: false } });
      },
      (error) => {
        console.error("Error loading meetings:", error);
        pushToast({ type: "error", title: "Erro ao carregar reuniões", message: error.message });
        dispatch({ type: "setLoading", payload: { meetings: false } });
      }
    );

    const notifQ = getNotificationsQuery(user.uid);
    const unsubNotif = onSnapshot(
      notifQ,
      (snap) => {
        const arr = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id }));
        dispatch({ type: "setNotifications", payload: arr });
      },
      (error) => {
        console.error("Error loading notifications:", error);
        pushToast({ type: "error", title: "Erro ao carregar notificações", message: error.message });
      }
    );

    return () => {
      unsubUsers();
      unsubCompanies();
      unsubProjects();
      unsubDeliveries();
      unsubMeetings();
      unsubNotif();
      unsubAdmins();
    };
  }, [user?.uid, profile?.role, profile?.active, role, pushToast, dispatch]);
}
