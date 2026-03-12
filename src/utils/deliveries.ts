import { Delivery, Progress, Status } from "../types";

export function resolveProgress(status: Status, progress?: Progress) {
  if (progress) return progress;
  switch (status) {
    case "APROVADO":
      return "APROVADO";
    case "REVISAO":
      return "REVISAO";
    case "AJUSTES":
      return "FAZENDO";
    default:
      return "A_FAZER";
  }
}

export function normalizeDeliveryRecord(rawValue: Record<string, unknown>, id: string): Delivery {
  const status = (rawValue.status as Status) || "PENDENTE";
  const progress = resolveProgress(status, rawValue.progress as Progress | undefined);
  const memberUids = Array.isArray(rawValue.memberUids)
    ? rawValue.memberUids.filter((entry): entry is string => typeof entry === "string")
    : [];

  return {
    ...(rawValue as Partial<Delivery>),
    id,
    projectId: typeof rawValue.projectId === "string" ? rawValue.projectId : "",
    client: typeof rawValue.client === "string" ? rawValue.client : "Empresa nao definida",
    project: typeof rawValue.project === "string" ? rawValue.project : "Projeto nao definido",
    ...(typeof rawValue.managerUid === "string" ? { managerUid: rawValue.managerUid } : {}),
    memberUids,
    title: typeof rawValue.title === "string" ? rawValue.title : "Entrega sem titulo",
    deadline: typeof rawValue.deadline === "string" ? rawValue.deadline : "",
    status,
    progress,
    priority: (rawValue.priority as Delivery["priority"]) || "MEDIA",
    provider: typeof rawValue.provider === "string" ? rawValue.provider : "Prestador",
    ...(typeof rawValue.providerUid === "string" ? { providerUid: rawValue.providerUid } : {}),
    description: typeof rawValue.description === "string" ? rawValue.description : "",
    checklist: Array.isArray(rawValue.checklist) ? (rawValue.checklist as Delivery["checklist"]) : [],
    attachments: Array.isArray(rawValue.attachments) ? (rawValue.attachments as Delivery["attachments"]) : [],
    comments: Array.isArray(rawValue.comments) ? (rawValue.comments as Delivery["comments"]) : [],
    externalLinks: Array.isArray(rawValue.externalLinks)
      ? (rawValue.externalLinks as Delivery["externalLinks"])
      : [],
    ...(rawValue.deadlineChangeRequest ? { deadlineChangeRequest: rawValue.deadlineChangeRequest as Delivery["deadlineChangeRequest"] } : {}),
    createdAt: typeof rawValue.createdAt === "number" ? rawValue.createdAt : Date.now(),
    ...(typeof rawValue.updatedAt === "number" ? { updatedAt: rawValue.updatedAt } : {}),
    ...(typeof rawValue.deletedAt === "number" ? { deletedAt: rawValue.deletedAt } : {}),
  };
}
