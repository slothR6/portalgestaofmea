import {
  AppNotification,
  Company,
  Delivery,
  FinancialSyncStatus,
  Meeting,
  Project,
  ProjectModule,
  ProjectStatus,
  ProviderSafetyDoc,
  UserProfile,
} from "../../types";

export interface PortalState {
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
    projectType: "" | "INSPECAO" | "ANALISE_FALHA" | "DESENVOLVIMENTO_ENGENHARIA" | "OUTRO";
    projectTypeOther: string;
  };
  projectEditForm: {
    id: string;
    companyId: string;
    companyName: string;
    name: string;
    description: string;
    memberUids: string[];
    projectType: "" | "INSPECAO" | "ANALISE_FALHA" | "DESENVOLVIMENTO_ENGENHARIA" | "OUTRO";
    projectTypeOther: string;
    status: ProjectStatus;
    completionRate: string;
    scopeSummary: string;
    executiveCurrentMoment: string;
    executiveNextStep: string;
    executiveMainRisk: string;
    modules: ProjectModule[];
    financialSyncStatus: FinancialSyncStatus;
    financialPlannedRevenue: string;
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
  proposalDraftOpportunityId: string | null;
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
  | { type: "setProposalDraftOpportunityId"; payload: string | null }
  | { type: "setSelectedUserProfile"; payload: UserProfile | null }
  | { type: "setSelectedProviderUid"; payload: string | null };

export const initialPortalState: PortalState = {
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
    projectType: "",
    projectTypeOther: "",
  },
  projectEditForm: {
    id: "",
    companyId: "",
    companyName: "",
    name: "",
    description: "",
    memberUids: [],
    projectType: "",
    projectTypeOther: "",
    status: "EM_ANDAMENTO",
    completionRate: "0",
    scopeSummary: "",
    executiveCurrentMoment: "",
    executiveNextStep: "",
    executiveMainRisk: "",
    modules: [],
    financialSyncStatus: "NAO_CONFIGURADO",
    financialPlannedRevenue: "",
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
  proposalDraftOpportunityId: null,
  selectedUserProfile: null,
  selectedProviderUid: null,
};

export function portalReducer(state: PortalState, action: PortalAction): PortalState {
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
    case "setProposalDraftOpportunityId":
      return { ...state, proposalDraftOpportunityId: action.payload };
    case "setSelectedUserProfile":
      return { ...state, selectedUserProfile: action.payload };
    case "setSelectedProviderUid":
      return { ...state, selectedProviderUid: action.payload };
    default:
      return state;
  }
}
