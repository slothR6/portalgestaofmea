import React, { createContext, useContext, useMemo, useReducer } from "react";
import { User } from "firebase/auth";
import { AppNotification, Company, Delivery, Meeting, Project, ProviderSafetyDoc, UserProfile, UserRole, ViewState } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { ToastItem, useToasts } from "../../hooks/useToasts";
import { usePortalSubscriptions } from "../../hooks/usePortalSubscriptions";
import { useProviderSafetyDocs } from "../../hooks/useProviderSafetyDocs";
import { useSyncView } from "../../hooks/useSyncView";

interface PortalState {
  users: UserProfile[];
  companies: Company[];
  projects: Project[];
  deliveries: Delivery[];
  meetings: Meeting[];
  notifications: AppNotification[];
  adminUids: string[];
  providerDocs: ProviderSafetyDoc[];
  projectForm: {
    companyId: string;
    name: string;
    description: string;
    memberUids: string[];
  };
  projectEditForm: {
    id: string;
    companyId: string;
    companyName: string;
    name: string;
    description: string;
    memberUids: string[];
  };
  deliveryForm: {
    projectId: string;
    title: string;
    deadline: string;
    priority: "BAIXA" | "MEDIA" | "ALTA";
    providerUid: string;
    providerName: string;
    description: string;
  };
  modals: {
    projectCreateOpen: boolean;
    projectEditOpen: boolean;
    deliveryCreateOpen: boolean;
  };
  loading: {
    users: boolean;
    projects: boolean;
    companies: boolean;
    deliveries: boolean;
    meetings: boolean;
  };
  selectedProjectId: string | null;
  selectedDeliveryId: string | null;
  selectedUserProfile: UserProfile | null;
  selectedProviderUid: string | null;
}

export type PortalAction =
  | { type: "setUsers"; payload: UserProfile[] }
  | { type: "setCompanies"; payload: Company[] }
  | { type: "setProjects"; payload: Project[] }
  | { type: "setDeliveries"; payload: Delivery[] }
  | { type: "setMeetings"; payload: Meeting[] }
  | { type: "setNotifications"; payload: AppNotification[] }
  | { type: "setAdminUids"; payload: string[] }
  | { type: "setProviderDocs"; payload: ProviderSafetyDoc[] }
  | { type: "setProjectForm"; payload: PortalState["projectForm"] }
  | { type: "setProjectEditForm"; payload: PortalState["projectEditForm"] }
  | { type: "setDeliveryForm"; payload: PortalState["deliveryForm"] }
  | { type: "setModals"; payload: Partial<PortalState["modals"]> }
  | { type: "setLoading"; payload: Partial<PortalState["loading"]> }
  | { type: "setSelectedProjectId"; payload: string | null }
  | { type: "setSelectedDeliveryId"; payload: string | null }
  | { type: "setSelectedUserProfile"; payload: UserProfile | null }
  | { type: "setSelectedProviderUid"; payload: string | null };

const initialState: PortalState = {
  users: [],
  companies: [],
  projects: [],
  deliveries: [],
  meetings: [],
  notifications: [],
  adminUids: [],
  providerDocs: [],
  projectForm: {
    companyId: "",
    name: "",
    description: "",
    memberUids: [],
  },
  projectEditForm: {
    id: "",
    companyId: "",
    companyName: "",
    name: "",
    description: "",
    memberUids: [],
  },
  deliveryForm: {
    projectId: "",
    title: "",
    deadline: "",
    priority: "MEDIA",
    providerUid: "",
    providerName: "",
    description: "",
  },
  modals: {
    projectCreateOpen: false,
    projectEditOpen: false,
    deliveryCreateOpen: false,
  },
  loading: {
    users: false,
    projects: false,
    companies: false,
    deliveries: false,
    meetings: false,
  },
  selectedProjectId: null,
  selectedDeliveryId: null,
  selectedUserProfile: null,
  selectedProviderUid: null,
};

function portalReducer(state: PortalState, action: PortalAction): PortalState {
  switch (action.type) {
    case "setUsers":
      return { ...state, users: action.payload };
    case "setCompanies":
      return { ...state, companies: action.payload };
    case "setProjects":
      return { ...state, projects: action.payload };
    case "setDeliveries":
      return { ...state, deliveries: action.payload };
    case "setMeetings":
      return { ...state, meetings: action.payload };
    case "setNotifications":
      return { ...state, notifications: action.payload };
    case "setAdminUids":
      return { ...state, adminUids: action.payload };
    case "setProviderDocs":
      return { ...state, providerDocs: action.payload };
    case "setProjectForm":
      return { ...state, projectForm: action.payload };
    case "setProjectEditForm":
      return { ...state, projectEditForm: action.payload };
    case "setDeliveryForm":
      return { ...state, deliveryForm: action.payload };
    case "setModals":
      return { ...state, modals: { ...state.modals, ...action.payload } };
    case "setLoading":
      return { ...state, loading: { ...state.loading, ...action.payload } };
    case "setSelectedProjectId":
      return { ...state, selectedProjectId: action.payload };
    case "setSelectedDeliveryId":
      return { ...state, selectedDeliveryId: action.payload };
    case "setSelectedUserProfile":
      return { ...state, selectedUserProfile: action.payload };
    case "setSelectedProviderUid":
      return { ...state, selectedProviderUid: action.payload };
    default:
      return state;
  }
}

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
    setSelectedUserProfile: (payload: UserProfile | null) => void;
    setSelectedProviderUid: (payload: string | null) => void;
  };
}

const PortalContext = createContext<PortalContextValue | undefined>(undefined);

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const { toasts, push, remove } = useToasts();
  const [state, dispatch] = useReducer(portalReducer, initialState);

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
    view: auth.view,
    setView: auth.setView,
  });

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
      setView: auth.setView,
      setProfile: auth.setProfile,
      toasts,
      pushToast: push,
      removeToast: remove,
      state,
      actions,
    }),
    [auth, toasts, push, remove, state, actions]
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
