import { useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { Company, UserProfile } from "../../types";
import { getCompaniesQuery } from "../../services/companies";
import { getAdminUsersQuery, getBaseUsersQuery } from "../../services/portal";
import { PortalSubscriptionsArgs } from "./types";

export function useAdminDataSubscriptions({ user, profile, role, pushToast, dispatch }: PortalSubscriptionsArgs) {
  useEffect(() => {
    if (!user || !profile || !profile.active) return;

    if (role !== "ADMIN") {
      dispatch({ type: "setUsers", payload: [] });
      dispatch({ type: "setAdminUids", payload: [] });
      dispatch({ type: "setCompanies", payload: [] });
      dispatch({ type: "setLoading", payload: { users: false, companies: false } });
      return;
    }

    dispatch({ type: "setLoading", payload: { users: true, companies: true } });

    const usersQ = getBaseUsersQuery(true);
    const unsubUsers = onSnapshot(
      usersQ,
      (snap) => {
        const arr = snap.docs
          .map((doc) => doc.data() as UserProfile)
          .filter((entry) => entry.status !== "DELETED");
        dispatch({ type: "setUsers", payload: arr });
        dispatch({ type: "setLoading", payload: { users: false } });
      },
      (error) => {
        console.error("Error loading users:", error);
        pushToast({ type: "error", title: "Erro ao carregar usuarios", message: error.message });
        dispatch({ type: "setLoading", payload: { users: false } });
      }
    );

    const adminUsersQ = getAdminUsersQuery();
    const unsubAdmins = onSnapshot(
      adminUsersQ,
      (snap) => {
        const arr = snap.docs.map((doc) => doc.data() as UserProfile);
        dispatch({ type: "setAdminUids", payload: arr.map((entry) => entry.uid) });
      },
      (error) => {
        console.error("Error loading admin users:", error);
        if (error?.code !== "permission-denied") {
          pushToast({ type: "error", title: "Erro ao carregar administradores", message: error.message });
        }
      }
    );

    const companiesQ = getCompaniesQuery();
    const unsubCompanies = onSnapshot(
      companiesQ,
      (snap) => {
        const arr = snap.docs
          .map((doc) => ({ ...(doc.data() as Company), id: doc.id }))
          .filter((entry) => !entry.deletedAt);
        dispatch({ type: "setCompanies", payload: arr });
        dispatch({ type: "setLoading", payload: { companies: false } });
      },
      (error) => {
        console.error("Error loading companies:", error);
        pushToast({ type: "error", title: "Erro ao carregar empresas", message: error.message });
        dispatch({ type: "setLoading", payload: { companies: false } });
      }
    );

    return () => {
      unsubUsers();
      unsubAdmins();
      unsubCompanies();
    };
  }, [user?.uid, profile?.active, role, pushToast, dispatch]);
}
