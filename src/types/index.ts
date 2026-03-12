export type UserRole = "ADMIN" | "PRESTADOR";
export type UserStatus = "PENDING" | "ACTIVE" | "REJECTED" | "DELETED";

export type Status = "PENDENTE" | "REVISAO" | "AJUSTES" | "APROVADO" | "ATRASADO";
export type Progress = "A_FAZER" | "FAZENDO" | "REVISAO" | "APROVADO";
export type Priority = "BAIXA" | "MEDIA" | "ALTA";
export type ProjectStatus = "PROPOSTA" | "EM_ANDAMENTO" | "CONCLUIDO" | "PAUSADO" | "RECUSADA";
export type ProjectType = "INSPECAO" | "ANALISE_FALHA" | "DESENVOLVIMENTO_ENGENHARIA" | "OUTRO";
export type ProjectModuleKey =
  | "FABRICACAO"
  | "COMPRAS"
  | "CRONOGRAMA_TECNICO"
  | "CAMPO_MOBILIZACAO"
  | "FINANCEIRO"
  | "RISCOS"
  | "MARCOS"
  | "DOCUMENTACAO"
  | "FORNECEDORES"
  | "QUALIDADE";
export type ProjectModuleStatus = "NAO_INICIADO" | "EM_ANDAMENTO" | "CONCLUIDO" | "BLOQUEADO";
export type ProjectHealth = "NO_PRAZO" | "ATENCAO" | "CRITICO";
export type FinancialSyncStatus = "NAO_CONFIGURADO" | "AGUARDANDO_CONEXAO" | "PRONTO";

export type ViewState =
  | "LOGIN"
  | "SIGNUP"
  | "PENDING"
  | "DASHBOARD"
  | "REUNIOES"
  | "EMPRESAS"
  | "OPORTUNIDADES"
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

export type DeliveryDeadlineRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface DeliveryDeadlineRequest {
  id: string;
  requestedDeadline: string;
  reason: string;
  requestedAt: number;
  requestedByUid: string;
  status: DeliveryDeadlineRequestStatus;
  decidedAt?: number;
  decidedByUid?: string;
  adminNote?: string;
}

export interface Delivery {
  id: string;
  projectId: string;
  client: string;
  project: string;
  managerUid?: string;
  memberUids?: string[];

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
  deadlineChangeRequest?: DeliveryDeadlineRequest;

  createdAt: number;
  updatedAt?: number;
  deletedAt?: number;
}

export interface Project {
  id: string;
  companyId: string;
  companyName: string;
  sourceProposalId?: string;
  sourceOpportunityId?: string;
  proposalValue?: number;
  primaryContactName?: string;
  opportunitySource?: string;
  serviceTypeLabel?: string;
  scopeSummary?: string;
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
  health?: ProjectHealth;
  modules?: ProjectModule[];
  executiveSummary?: ProjectExecutiveSummary;
  financial?: ProjectFinancialOverview;
  externalLinks?: ExternalLink[];
  createdAt: number;
  updatedAt?: number;
  deletedAt?: number;
}

export interface ProjectModule {
  key: ProjectModuleKey;
  status: ProjectModuleStatus;
  summary?: string;
  ownerUid?: string;
  ownerName?: string;
  updatedAt?: number;
}

export interface ProjectExecutiveSummary {
  scope?: string;
  currentMoment?: string;
  nextStep?: string;
  mainRisk?: string;
  highlights?: string[];
}

export interface ProjectFinancialOverview {
  integrationProvider: "CONTA_AZUL";
  syncStatus: FinancialSyncStatus;
  plannedRevenue?: number;
  externalCustomerId?: string;
  externalProjectId?: string;
  lastSyncAt?: number;
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

export type ContactStatus = "ACTIVE" | "INACTIVE";

export interface CompanyContact {
  id: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
  status: ContactStatus;
  createdAt: number;
  updatedAt?: number;
  createdByUid: string;
}

export type OpportunityStage =
  | "NOVA"
  | "QUALIFICACAO"
  | "DIAGNOSTICO"
  | "PROPOSTA"
  | "NEGOCIACAO"
  | "GANHA"
  | "PERDIDA";

export interface OpportunityCompanySnapshot {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
}

export interface OpportunityContactSnapshot {
  id: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
}

export interface Opportunity {
  id: string;
  companyId: string;
  primaryContactId?: string;
  title: string;
  description?: string;
  serviceType?: string;
  stage: OpportunityStage;
  source?: string;
  estimatedValue?: number;
  ownerUid: string;
  ownerName?: string;
  expectedCloseAt?: string;
  notes?: string;
  companySnapshot: OpportunityCompanySnapshot;
  contactSnapshot?: OpportunityContactSnapshot;
  createdAt: number;
  updatedAt?: number;
  archivedAt?: number;
}

export type ProposalStatus = "RASCUNHO" | "EM_ANALISE" | "APROVADA" | "RECUSADA";

export interface ProposalCompanySnapshot {
  id: string;
  name: string;
}

export interface ProposalOpportunitySnapshot {
  id: string;
  title: string;
  stage: OpportunityStage;
  primaryContactId?: string;
  contactName?: string;
  source?: string;
  serviceType?: string;
  estimatedValue?: number;
}

export interface Proposal {
  id: string;
  companyId: string;
  opportunityId: string;
  title: string;
  scopeSummary?: string;
  value?: number;
  status: ProposalStatus;
  ownerUid: string;
  ownerName?: string;
  companySnapshot: ProposalCompanySnapshot;
  opportunitySnapshot: ProposalOpportunitySnapshot;
  createdAt: number;
  updatedAt?: number;
  approvedAt?: number;
  approvedByUid?: string;
  approvedByName?: string;
  rejectedAt?: number;
  projectId?: string;
  sourceProjectId?: string;
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

// Legacy Firestore surfaces still present in the current rules baseline.
// They are not used by the visible React UI today, but they are part of the
// production security surface and should remain typed for governance purposes.

export type ProjectAttachment = Attachment;

export interface ProviderDelivery {
  id: string;
  providerUid: string;
  status?: string;
  attachments?: Attachment[];
  updatedAt?: number;
  [key: string]: unknown;
}

export interface PaymentMilestone {
  id: string;
  providerUid: string;
  status?: string;
  [key: string]: unknown;
}

export interface MeasurementReport {
  id: string;
  providerUid: string;
  amountCents?: number;
  status?: string;
  submittedAt?: number;
  updatedAt?: number;
  [key: string]: unknown;
}
