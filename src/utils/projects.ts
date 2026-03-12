import {
  FinancialSyncStatus,
  Project,
  ProjectExecutiveSummary,
  ProjectFinancialOverview,
  ProjectHealth,
  ProjectModule,
  ProjectModuleKey,
  ProjectModuleStatus,
  ProjectStatus,
  ProjectType,
} from "../types";

interface ProjectModuleDefinition {
  key: ProjectModuleKey;
  label: string;
  description: string;
}

const PROJECT_MODULE_DEFINITIONS: ProjectModuleDefinition[] = [
  { key: "FABRICACAO", label: "Fabricacao", description: "Controle de producao e interfaces industriais." },
  { key: "COMPRAS", label: "Compras", description: "Aquisicoes, cotacoes e follow-up de suprimentos." },
  {
    key: "CRONOGRAMA_TECNICO",
    label: "Cronograma tecnico",
    description: "Planejamento tecnico, frentes e dependencias.",
  },
  {
    key: "CAMPO_MOBILIZACAO",
    label: "Campo e mobilizacao",
    description: "Logistica operacional, equipe e mobilizacao em campo.",
  },
  { key: "FINANCEIRO", label: "Financeiro", description: "Preparacao para faturamento e integracao." },
  { key: "RISCOS", label: "Riscos", description: "Mapa de riscos, contingencias e escalacoes." },
  { key: "MARCOS", label: "Marcos", description: "Gate reviews, marcos contratuais e decisorios." },
  {
    key: "DOCUMENTACAO",
    label: "Documentacao",
    description: "Registros tecnicos, evidencias e documentacao controlada.",
  },
  { key: "FORNECEDORES", label: "Fornecedores", description: "Gestao de terceiros e parceiros externos." },
  { key: "QUALIDADE", label: "Qualidade", description: "Checklist, revisoes e criterios de aceite." },
];

const DEFAULT_MODULES_BY_TYPE: Record<ProjectType, ProjectModuleKey[]> = {
  INSPECAO: ["CRONOGRAMA_TECNICO", "CAMPO_MOBILIZACAO", "DOCUMENTACAO", "QUALIDADE"],
  ANALISE_FALHA: ["RISCOS", "DOCUMENTACAO", "QUALIDADE", "MARCOS"],
  DESENVOLVIMENTO_ENGENHARIA: [
    "COMPRAS",
    "CRONOGRAMA_TECNICO",
    "DOCUMENTACAO",
    "FORNECEDORES",
    "QUALIDADE",
  ],
  OUTRO: ["DOCUMENTACAO", "MARCOS", "QUALIDADE"],
};

const VALID_PROJECT_TYPES = new Set<ProjectType>([
  "INSPECAO",
  "ANALISE_FALHA",
  "DESENVOLVIMENTO_ENGENHARIA",
  "OUTRO",
]);
const VALID_PROJECT_STATUSES = new Set<ProjectStatus>([
  "PROPOSTA",
  "EM_ANDAMENTO",
  "CONCLUIDO",
  "PAUSADO",
  "RECUSADA",
]);
const VALID_MODULE_KEYS = new Set<ProjectModuleKey>(PROJECT_MODULE_DEFINITIONS.map((moduleDef) => moduleDef.key));
const VALID_MODULE_STATUSES = new Set<ProjectModuleStatus>([
  "NAO_INICIADO",
  "EM_ANDAMENTO",
  "CONCLUIDO",
  "BLOQUEADO",
]);
const VALID_HEALTH_VALUES = new Set<ProjectHealth>(["NO_PRAZO", "ATENCAO", "CRITICO"]);
const VALID_FINANCIAL_SYNC_VALUES = new Set<FinancialSyncStatus>([
  "NAO_CONFIGURADO",
  "AGUARDANDO_CONEXAO",
  "PRONTO",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isProjectType(value: unknown): value is ProjectType {
  return typeof value === "string" && VALID_PROJECT_TYPES.has(value as ProjectType);
}

function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === "string" && VALID_PROJECT_STATUSES.has(value as ProjectStatus);
}

function isModuleKey(value: unknown): value is ProjectModuleKey {
  return typeof value === "string" && VALID_MODULE_KEYS.has(value as ProjectModuleKey);
}

function isModuleStatus(value: unknown): value is ProjectModuleStatus {
  return typeof value === "string" && VALID_MODULE_STATUSES.has(value as ProjectModuleStatus);
}

function isHealthValue(value: unknown): value is ProjectHealth {
  return typeof value === "string" && VALID_HEALTH_VALUES.has(value as ProjectHealth);
}

function isFinancialSyncStatus(value: unknown): value is FinancialSyncStatus {
  return typeof value === "string" && VALID_FINANCIAL_SYNC_VALUES.has(value as FinancialSyncStatus);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clampPercentage(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusNarrative(status: ProjectStatus) {
  switch (status) {
    case "CONCLUIDO":
      return "Projeto concluido e em fase de consolidacao executiva.";
    case "PAUSADO":
      return "Projeto pausado, com necessidade de replanejamento e definicao do proximo passo.";
    case "RECUSADA":
      return "Registro mantido apenas para historico comercial.";
    case "PROPOSTA":
      return "Projeto ainda em fase comercial, aguardando aprovacao final.";
    default:
      return "Projeto em execucao com acompanhamento comercial e operacional.";
  }
}

export function getProjectTypeLabel(projectType?: ProjectType | null, projectTypeOther?: string | null) {
  if (projectType === "OUTRO") return projectTypeOther || "Outro";
  if (projectType === "INSPECAO") return "Inspecao";
  if (projectType === "ANALISE_FALHA") return "Analise de falha";
  if (projectType === "DESENVOLVIMENTO_ENGENHARIA") return "Desenvolvimento de engenharia";
  return "Nao informado";
}

export function getProjectModuleDefinitions() {
  return PROJECT_MODULE_DEFINITIONS;
}

export function getProjectModuleLabel(key: ProjectModuleKey) {
  return PROJECT_MODULE_DEFINITIONS.find((moduleDef) => moduleDef.key === key)?.label || key;
}

export function getProjectModuleDescription(key: ProjectModuleKey) {
  return PROJECT_MODULE_DEFINITIONS.find((moduleDef) => moduleDef.key === key)?.description || "";
}

export function inferProjectTypeFromContext({
  projectType,
  title,
  scopeSummary,
  serviceTypeLabel,
}: {
  projectType?: unknown;
  title?: unknown;
  scopeSummary?: unknown;
  serviceTypeLabel?: unknown;
}) {
  if (isProjectType(projectType)) return projectType;

  const haystack = [title, scopeSummary, serviceTypeLabel]
    .map((value) => asString(value).toLowerCase())
    .join(" ");

  if (/inspec|laudo|vistoria|nr-/.test(haystack)) return "INSPECAO";
  if (/falha|causa|root cause|rca/.test(haystack)) return "ANALISE_FALHA";
  if (/engenharia|desenvolvimento|projeto mecanico|projeto eletrico/.test(haystack)) {
    return "DESENVOLVIMENTO_ENGENHARIA";
  }

  return "OUTRO";
}

export function buildDefaultProjectModules(projectType: ProjectType) {
  return DEFAULT_MODULES_BY_TYPE[projectType].map(
    (key): ProjectModule => ({
      key,
      status: "NAO_INICIADO",
    })
  );
}

function normalizeProjectModules(projectType: ProjectType, rawModules: unknown) {
  const normalized = new Map<ProjectModuleKey, ProjectModule>();

  if (Array.isArray(rawModules)) {
    rawModules.forEach((rawModule) => {
      if (!isRecord(rawModule) || !isModuleKey(rawModule.key)) return;

      normalized.set(rawModule.key, {
        key: rawModule.key,
        status: isModuleStatus(rawModule.status) ? rawModule.status : "NAO_INICIADO",
        ...(asOptionalString(rawModule.summary) ? { summary: asOptionalString(rawModule.summary) } : {}),
        ...(asOptionalString(rawModule.ownerUid) ? { ownerUid: asOptionalString(rawModule.ownerUid) } : {}),
        ...(asOptionalString(rawModule.ownerName) ? { ownerName: asOptionalString(rawModule.ownerName) } : {}),
        ...(asOptionalNumber(rawModule.updatedAt) ? { updatedAt: asOptionalNumber(rawModule.updatedAt) } : {}),
      });
    });
  }

  if (normalized.size === 0) {
    buildDefaultProjectModules(projectType).forEach((moduleDef) => normalized.set(moduleDef.key, moduleDef));
  }

  return Array.from(normalized.values());
}

function normalizeExecutiveSummary(
  rawValue: unknown,
  status: ProjectStatus,
  fallbackScope: string
): ProjectExecutiveSummary {
  const rawSummary = isRecord(rawValue) ? rawValue : {};
  const highlights = Array.isArray(rawSummary.highlights)
    ? rawSummary.highlights.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];

  return {
    ...(fallbackScope ? { scope: asOptionalString(rawSummary.scope) || fallbackScope } : {}),
    currentMoment: asOptionalString(rawSummary.currentMoment) || statusNarrative(status),
    ...(asOptionalString(rawSummary.nextStep) ? { nextStep: asOptionalString(rawSummary.nextStep) } : {}),
    ...(asOptionalString(rawSummary.mainRisk) ? { mainRisk: asOptionalString(rawSummary.mainRisk) } : {}),
    ...(highlights.length > 0 ? { highlights } : {}),
  };
}

function normalizeFinancialOverview(
  rawValue: unknown,
  proposalValue?: number
): ProjectFinancialOverview {
  const rawFinancial = isRecord(rawValue) ? rawValue : {};

  return {
    integrationProvider: "CONTA_AZUL",
    syncStatus: isFinancialSyncStatus(rawFinancial.syncStatus)
      ? rawFinancial.syncStatus
      : "NAO_CONFIGURADO",
    ...(asOptionalNumber(rawFinancial.plannedRevenue) || proposalValue
      ? { plannedRevenue: asOptionalNumber(rawFinancial.plannedRevenue) || proposalValue }
      : {}),
    ...(asOptionalString(rawFinancial.externalCustomerId)
      ? { externalCustomerId: asOptionalString(rawFinancial.externalCustomerId) }
      : {}),
    ...(asOptionalString(rawFinancial.externalProjectId)
      ? { externalProjectId: asOptionalString(rawFinancial.externalProjectId) }
      : {}),
    ...(asOptionalNumber(rawFinancial.lastSyncAt) ? { lastSyncAt: asOptionalNumber(rawFinancial.lastSyncAt) } : {}),
  };
}

export function normalizeProjectRecord(rawValue: Record<string, unknown>, id: string): Project {
  const projectType = inferProjectTypeFromContext({
    projectType: rawValue.projectType,
    title: rawValue.name,
    scopeSummary: rawValue.scopeSummary || rawValue.description,
    serviceTypeLabel: rawValue.serviceTypeLabel,
  });
  const status = isProjectStatus(rawValue.status) ? rawValue.status : "EM_ANDAMENTO";
  const proposalValue = asOptionalNumber(rawValue.proposalValue);
  const memberUids = Array.isArray(rawValue.memberUids)
    ? rawValue.memberUids.filter((entry): entry is string => typeof entry === "string")
    : [];
  const scopeSummary = asOptionalString(rawValue.scopeSummary) || asOptionalString(rawValue.description) || "";

  return {
    ...(rawValue as Partial<Project>),
    id,
    companyId: asString(rawValue.companyId),
    companyName: asString(rawValue.companyName) || asString(rawValue.client) || "Empresa nao definida",
    name: asString(rawValue.name) || "Projeto sem nome",
    ...(asOptionalString(rawValue.description) ? { description: asOptionalString(rawValue.description) } : {}),
    ...(asOptionalString(rawValue.manager) ? { manager: asOptionalString(rawValue.manager) } : { manager: "Nao informado" }),
    ...(asOptionalString(rawValue.managerUid) ? { managerUid: asOptionalString(rawValue.managerUid) } : { managerUid: "" }),
    memberUids,
    status,
    projectType,
    ...(projectType === "OUTRO" && asOptionalString(rawValue.projectTypeOther)
      ? { projectTypeOther: asOptionalString(rawValue.projectTypeOther) }
      : {}),
    ...(asOptionalString(rawValue.sourceProposalId)
      ? { sourceProposalId: asOptionalString(rawValue.sourceProposalId) }
      : {}),
    ...(asOptionalString(rawValue.sourceOpportunityId)
      ? { sourceOpportunityId: asOptionalString(rawValue.sourceOpportunityId) }
      : {}),
    ...(proposalValue ? { proposalValue } : {}),
    ...(asOptionalString(rawValue.primaryContactName)
      ? { primaryContactName: asOptionalString(rawValue.primaryContactName) }
      : {}),
    ...(asOptionalString(rawValue.opportunitySource)
      ? { opportunitySource: asOptionalString(rawValue.opportunitySource) }
      : {}),
    ...(asOptionalString(rawValue.serviceTypeLabel)
      ? { serviceTypeLabel: asOptionalString(rawValue.serviceTypeLabel) }
      : {}),
    ...(scopeSummary ? { scopeSummary } : {}),
    completionRate: clampPercentage(rawValue.completionRate),
    health: isHealthValue(rawValue.health) ? rawValue.health : status === "PAUSADO" ? "ATENCAO" : "NO_PRAZO",
    modules: normalizeProjectModules(projectType, rawValue.modules),
    executiveSummary: normalizeExecutiveSummary(rawValue.executiveSummary, status, scopeSummary),
    financial: normalizeFinancialOverview(rawValue.financial, proposalValue),
    externalLinks: Array.isArray(rawValue.externalLinks)
      ? (rawValue.externalLinks as Project["externalLinks"])
      : [],
    createdAt: asOptionalNumber(rawValue.createdAt) || Date.now(),
    ...(asOptionalNumber(rawValue.updatedAt) ? { updatedAt: asOptionalNumber(rawValue.updatedAt) } : {}),
    ...(asOptionalNumber(rawValue.deletedAt) ? { deletedAt: asOptionalNumber(rawValue.deletedAt) } : {}),
    ...(asOptionalString(rawValue.proposalCode) ? { proposalCode: asOptionalString(rawValue.proposalCode) } : {}),
    ...(asOptionalNumber(rawValue.proposalSequence)
      ? { proposalSequence: asOptionalNumber(rawValue.proposalSequence) }
      : {}),
  };
}
