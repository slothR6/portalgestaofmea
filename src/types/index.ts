export type UserRole = "ADMIN" | "PRESTADOR";
export type UserStatus = "PENDING" | "ACTIVE" | "REJECTED" | "DELETED";

export type Status = "PENDENTE" | "REVISAO" | "AJUSTES" | "APROVADO" | "ATRASADO";
export type Progress = "A_FAZER" | "FAZENDO" | "REVISAO" | "APROVADO";
export type Priority = "BAIXA" | "MEDIA" | "ALTA";
export type ProjectStatus = "PROPOSTA" | "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO" | "RECUSADA";
export type ProjectType = "INSPECAO" | "ANALISE_FALHA" | "DESENVOLVIMENTO_ENGENHARIA" | "OUTRO";

export type ViewState =
  | "LOGIN"
  | "SIGNUP"
  | "PENDING"
  | "DASHBOARD"
  | "REUNIOES"
  | "EMPRESAS"
  | "PROPOSTAS"
  | "PROJETOS"
  | "DETALHE_PROJETO"
  | "ENTREGAS"
  | "DETALHE_ENTREGA"
  | "USUARIOS"
  | "PRESTADORES"
  | "PERFIL";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;

  role: UserRole;
  status: UserStatus;
  active: boolean;

  pixKey?: string;
  photoURL?: string;

  createdAt: number;
  approvedAt?: number;
  deletedAt?: number;
}

export interface Comment {
  id: string;
  authorUid: string;
  authorName: string;
  date: string;
  text: string;
  createdAt: number;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  date: string;
  uploaderUid: string;
  uploaderName: string;
  url?: string;
  storagePath?: string;
  createdAt: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export interface ExternalLink {
  id: string;
  title: string;
  url: string;
  createdAt: number;
  createdByUid: string;
}

export interface Delivery {
  id: string;
  projectId: string;
  client: string;
  project: string;

  title: string;
  deadline: string;
  status: Status;
  progress: Progress;
  priority: Priority;

  provider: string;
  providerUid?: string;

  description: string;
  checklist: ChecklistItem[];

  // MVP sem storage: attachments pode ficar vazio.
  attachments: Attachment[];
  comments: Comment[];
  externalLinks?: ExternalLink[];
  deadlineChangeRequest?: {
    requestedDeadline: string;
    reason: string;
    requestedAt: number;
    requestedByUid: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    decidedAt?: number;
    decidedByUid?: string;
    adminNote?: string;
  };

  createdAt: number;
  deletedAt?: number;
}

export interface Project {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  description?: string; // NOVO CAMPO
  manager: string;
  managerUid: string;
  memberUids: string[];
  status: ProjectStatus;
  proposalCode?: string;
  proposalSequence?: number;
  projectType?: ProjectType;
  projectTypeOther?: string;
  completionRate: number;
  externalLinks?: ExternalLink[];
  createdAt: number;
  updatedAt?: number;
  deletedAt?: number;
}

export interface Company {
  id: string;
  companyNumber?: number;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: number;
  createdByUid: string;
  deletedAt?: number;
}

export type NotifType =
  | "COMMENT"
  | "SUBMITTED"
  | "APPROVED"
  | "ADJUST_REQUESTED"
  | "MEETING"
  | "NEW_DELIVERY"
  | "STARTED"
  | "DEADLINE_CHANGE_REQUESTED"
  | "DEADLINE_CHANGE_APPROVED"
  | "DEADLINE_CHANGE_REJECTED";

export interface AppNotification {
  id: string;
  toUid: string;
  type: NotifType;
  title: string;
  projectId?: string;
  deliveryId?: string;
  createdAt: number;
  read: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  startsAt: number;
  endsAt: number;
  status: "SCHEDULED" | "DONE" | "CANCELED";
  completedAt?: number;
  participantUids: string[];
  link?: string;
  createdByUid: string;
  createdAt: number;
  updatedAt?: number;
}

export interface ProviderSafetyDoc {
  id: string;
  title: string;        // ex: NR-35
  issuedAt: string;     // YYYY-MM-DD
  expiresAt?: string;   // YYYY-MM-DD
  notes?: string;
  externalUrl?: string; // link (Drive/OneDrive) enquanto sem Storage
  createdAt: number;
  createdByUid: string;
  createdByName: string;
}
