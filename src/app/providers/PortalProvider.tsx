import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { User } from "firebase/auth";
import { AppNotification, Company, Delivery, Meeting, Project, ProviderSafetyDoc, UserProfile, UserRole, ViewState } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { ToastItem, useToasts } from "../../hooks/useToasts";
import { usePortalSubscriptions } from "../../hooks/usePortalSubscriptions";
import { useProviderSafetyDocs } from "../../hooks/useProviderSafetyDocs";
import { useSyncView } from "../../hooks/useSyncView";
import { useAppRouter } from "../router/RouterProvider";
import { buildPathForView } from "../router/routes";
import { initialPortalState, portalReducer, PortalState } from "./portalState";

interface PortalContextValue {
  authReady: boolean;
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  view: ViewState;
  setView: (view: ViewState) => void;
  setProfile: (profile: UserProfile | null) => void;
  toasts: ToastItem[];
  pushToast: (payload: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
  state: PortalState;
  actions: {
    setUsers: (payload: UserProfile[]) => void;
    setCompanies: (payload: Company[]) => void;
    setProjects: (payload: Project[]) => void;
    setDeliveries: (payload: Delivery[]) => void;
    setMeetings: (payload: Meeting[]) => void;
    setNotifications: (payload: AppNotification[]) => void;
    setAdminUids: (payload: string[]) => void;
    setProviderDocs: (payload: ProviderSafetyDoc[]) => void;
    setProjectForm: (payload: PortalState["projectForm"]) => void;
    setProjectEditForm: (payload: PortalState["projectEditForm"]) => void;
    setDeliveryForm: (payload: PortalState["deliveryForm"]) => void;
    setModals: (payload: Partial<PortalState["modals"]>) => void;
    setLoading: (payload: Partial<PortalState["loading"]>) => void;
    setSelectedProjectId: (payload: string | null) => void;
    setSelectedDeliveryId: (payload: string | null) => void;
    setProposalDraftOpportunityId: (payload: string | null) => void;
    setSelectedUserProfile: (payload: UserProfile | null) => void;
    setSelectedProviderUid: (payload: string | null) => void;
  };
}

const PortalContext = createContext<PortalContextValue | undefined>(undefined);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const { toasts, push, remove } = useToasts();
  const [state, dispatch] = useReducer(portalReducer, initialPortalState);
  const { pathname, navigate } = useAppRouter();
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  usePortalSubscriptions({
    user: auth.user,
    profile: auth.profile,
    role: auth.role,
    pushToast: push,
    dispatch,
  });

  useProviderSafetyDocs({
    selectedProviderUid: state.selectedProviderUid,
    pushToast: push,
    dispatch,
  });

  useSyncView({
    user: auth.user,
    profile: auth.profile,
    role: auth.role,
    view: auth.view,
    pathname,
    navigate,
    selectedProjectId: state.selectedProjectId,
    selectedDeliveryId: state.selectedDeliveryId,
    setView: auth.setView,
    setSelectedProjectId: (payload: string | null) => dispatch({ type: "setSelectedProjectId", payload }),
    setSelectedDeliveryId: (payload: string | null) => dispatch({ type: "setSelectedDeliveryId", payload }),
  });

  useEffect(() => {
    if (auth.view !== "DETALHE_PROJETO" && auth.view !== "DETALHE_ENTREGA") return;

    const nextPath = buildPathForView({
      view: auth.view,
      role: auth.role,
      selectedProjectId: state.selectedProjectId,
      selectedDeliveryId: state.selectedDeliveryId,
    });

    if (nextPath && pathname !== nextPath) {
      navigate(nextPath);
    }
  }, [auth.view, auth.role, state.selectedProjectId, state.selectedDeliveryId, pathname, navigate]);

  const setView = React.useCallback(
    (nextView: ViewState) => {
      auth.setView(nextView);

      if (nextView === "DETALHE_PROJETO" || nextView === "DETALHE_ENTREGA") {
        return;
      }

      const nextPath = buildPathForView({
        view: nextView,
        role: auth.role,
        selectedProjectId: stateRef.current.selectedProjectId,
        selectedDeliveryId: stateRef.current.selectedDeliveryId,
      });

      if (nextPath && pathname !== nextPath) {
        navigate(nextPath);
      }
    },
    [auth, pathname, navigate]
  );

  const actions = useMemo(
    () => ({
      setUsers: (payload: UserProfile[]) => dispatch({ type: "setUsers", payload }),
      setCompanies: (payload: Company[]) => dispatch({ type: "setCompanies", payload }),
      setProjects: (payload: Project[]) => dispatch({ type: "setProjects", payload }),
      setDeliveries: (payload: Delivery[]) => dispatch({ type: "setDeliveries", payload }),
      setMeetings: (payload: Meeting[]) => dispatch({ type: "setMeetings", payload }),
      setNotifications: (payload: AppNotification[]) => dispatch({ type: "setNotifications", payload }),
      setAdminUids: (payload: string[]) => dispatch({ type: "setAdminUids", payload }),
      setProviderDocs: (payload: ProviderSafetyDoc[]) => dispatch({ type: "setProviderDocs", payload }),
      setProjectForm: (payload: PortalState["projectForm"]) => dispatch({ type: "setProjectForm", payload }),
      setProjectEditForm: (payload: PortalState["projectEditForm"]) =>
        dispatch({ type: "setProjectEditForm", payload }),
      setDeliveryForm: (payload: PortalState["deliveryForm"]) => dispatch({ type: "setDeliveryForm", payload }),
      setModals: (payload: Partial<PortalState["modals"]>) => dispatch({ type: "setModals", payload }),
      setLoading: (payload: Partial<PortalState["loading"]>) => dispatch({ type: "setLoading", payload }),
      setSelectedProjectId: (payload: string | null) => dispatch({ type: "setSelectedProjectId", payload }),
      setSelectedDeliveryId: (payload: string | null) => dispatch({ type: "setSelectedDeliveryId", payload }),
      setProposalDraftOpportunityId: (payload: string | null) =>
        dispatch({ type: "setProposalDraftOpportunityId", payload }),
      setSelectedUserProfile: (payload: UserProfile | null) =>
        dispatch({ type: "setSelectedUserProfile", payload }),
      setSelectedProviderUid: (payload: string | null) => dispatch({ type: "setSelectedProviderUid", payload }),
    }),
    []
  );

  const value = useMemo(
    () => ({
      authReady: auth.authReady,
      user: auth.user,
      profile: auth.profile,
      role: auth.role,
      view: auth.view,
      setView,
      setProfile: auth.setProfile,
      toasts,
      pushToast: push,
      removeToast: remove,
      state,
      actions,
    }),
    [auth, setView, toasts, push, remove, state, actions]
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortalContext() {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error("usePortalContext must be used within PortalProvider");
  }
  return context;
}
