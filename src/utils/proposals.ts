import { Proposal } from "../types";
import { sanitize } from "./sanitize";

export function getProposalApprovalIssues(proposal: Proposal) {
  const issues: string[] = [];

  if (!sanitize(proposal.title)) {
    issues.push("Titulo da proposta obrigatorio");
  }

  if (!sanitize(proposal.companyId) || !sanitize(proposal.companySnapshot?.name)) {
    issues.push("Empresa vinculada inconsistente");
  }

  if (!sanitize(proposal.opportunityId) || !sanitize(proposal.opportunitySnapshot?.title)) {
    issues.push("Oportunidade vinculada inconsistente");
  }

  if (!sanitize(proposal.scopeSummary)) {
    issues.push("Resumo do escopo obrigatorio");
  }

  if (typeof proposal.value !== "number" || Number.isNaN(proposal.value) || proposal.value <= 0) {
    issues.push("Valor final obrigatorio");
  }

  if (!sanitize(proposal.ownerUid)) {
    issues.push("Responsavel comercial obrigatorio");
  }

  if (proposal.status === "RECUSADA") {
    issues.push("Propostas recusadas nao podem ser aprovadas");
  }

  return issues;
}

export function isProposalReadyForApproval(proposal: Proposal) {
  return getProposalApprovalIssues(proposal).length === 0;
}
