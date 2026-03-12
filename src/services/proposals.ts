import {
  addDoc,
  collection,
  doc,
  limit,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { Opportunity, Project, Proposal } from "../types";
import { PAGE_SIZE } from "../constants";
import { getProposalApprovalIssues } from "../utils/proposals";
import { buildDefaultProjectModules, inferProjectTypeFromContext } from "../utils/projects";

export async function createProposal(payload: Omit<Proposal, "id">) {
  const proposalRef = doc(collection(db, "proposals"));
  const now = Date.now();

  await runTransaction(db, async (transaction) => {
    const opportunityRef = doc(db, "opportunities", payload.opportunityId);
    const opportunitySnap = await transaction.get(opportunityRef);

    transaction.set(proposalRef, payload);

    if (opportunitySnap.exists()) {
      const opportunity = opportunitySnap.data() as Opportunity;
      if (opportunity.stage !== "GANHA" && opportunity.stage !== "PERDIDA") {
        transaction.update(opportunityRef, {
          stage: "PROPOSTA",
          updatedAt: now,
        });
      }
    }
  });

  return proposalRef.id;
}

export async function updateProposal(proposalId: string, patch: Partial<Proposal>) {
  const now = Date.now();
  await runTransaction(db, async (transaction) => {
    const proposalRef = doc(db, "proposals", proposalId);
    transaction.update(proposalRef, {
      ...patch,
      updatedAt: now,
    });

    if (typeof patch.opportunityId === "string" && patch.opportunityId) {
      const opportunityRef = doc(db, "opportunities", patch.opportunityId);
      const opportunitySnap = await transaction.get(opportunityRef);
      if (opportunitySnap.exists()) {
        const opportunity = opportunitySnap.data() as Opportunity;
        if (opportunity.stage !== "GANHA" && opportunity.stage !== "PERDIDA") {
          transaction.update(opportunityRef, {
            stage: "PROPOSTA",
            updatedAt: now,
          });
        }
      }
    }
  });
}

function buildDerivedProjectId(proposalId: string) {
  return `proposal_${proposalId}`;
}

interface ApproveProposalArgs {
  proposalId: string;
  approverUid: string;
  approverName: string;
}

interface ApproveProposalResult {
  projectId: string;
  alreadyExisted: boolean;
}

export async function approveProposalAndCreateProject({
  proposalId,
  approverUid,
  approverName,
}: ApproveProposalArgs): Promise<ApproveProposalResult> {
  return runTransaction(db, async (transaction) => {
    const proposalRef = doc(db, "proposals", proposalId);
    const proposalSnap = await transaction.get(proposalRef);

    if (!proposalSnap.exists()) {
      throw new Error("Proposta nao encontrada");
    }

    const proposal = {
      ...(proposalSnap.data() as Omit<Proposal, "id">),
      id: proposalSnap.id,
    };

    const approvalIssues = getProposalApprovalIssues(proposal);
    if (approvalIssues.length > 0) {
      throw new Error(approvalIssues[0]);
    }

    const projectId = proposal.projectId || proposal.sourceProjectId || buildDerivedProjectId(proposalId);
    const projectRef = doc(db, "projects", projectId);
    const projectSnap = await transaction.get(projectRef);
    const opportunityRef = doc(db, "opportunities", proposal.opportunityId);
    const opportunitySnap = await transaction.get(opportunityRef);
    const now = Date.now();
    const opportunity = opportunitySnap.exists()
      ? ({
          ...(opportunitySnap.data() as Omit<Opportunity, "id">),
          id: opportunitySnap.id,
        } satisfies Opportunity)
      : null;
    const inferredProjectType = inferProjectTypeFromContext({
      title: proposal.title,
      scopeSummary: proposal.scopeSummary,
      serviceTypeLabel: proposal.opportunitySnapshot.serviceType || opportunity?.serviceType,
    });
    const summaryScope = proposal.scopeSummary || proposal.title;

    const projectPayload: Omit<Project, "id"> = {
      companyId: proposal.companyId,
      companyName: proposal.companySnapshot.name,
      sourceProposalId: proposal.id,
      sourceOpportunityId: proposal.opportunityId,
      ...(typeof proposal.value === "number" ? { proposalValue: proposal.value } : {}),
      ...(proposal.opportunitySnapshot.contactName || opportunity?.contactSnapshot?.name
        ? { primaryContactName: proposal.opportunitySnapshot.contactName || opportunity?.contactSnapshot?.name }
        : {}),
      ...(proposal.opportunitySnapshot.source || opportunity?.source
        ? { opportunitySource: proposal.opportunitySnapshot.source || opportunity?.source }
        : {}),
      ...(proposal.opportunitySnapshot.serviceType || opportunity?.serviceType
        ? { serviceTypeLabel: proposal.opportunitySnapshot.serviceType || opportunity?.serviceType }
        : {}),
      ...(proposal.scopeSummary ? { scopeSummary: proposal.scopeSummary } : {}),
      name: proposal.title,
      ...(proposal.scopeSummary ? { description: proposal.scopeSummary } : {}),
      manager: proposal.ownerName || approverName,
      managerUid: proposal.ownerUid,
      memberUids: [],
      status: "EM_ANDAMENTO",
      completionRate: 0,
      health: "NO_PRAZO",
      projectType: inferredProjectType,
      ...(inferredProjectType === "OUTRO" && proposal.opportunitySnapshot.serviceType
        ? { projectTypeOther: proposal.opportunitySnapshot.serviceType }
        : {}),
      modules: buildDefaultProjectModules(inferredProjectType),
      executiveSummary: {
        scope: summaryScope,
        currentMoment: "Projeto derivado de proposta aprovada e pronto para kickoff operacional.",
        nextStep: "Definir equipe, kickoff e primeiras entregas prioritarias.",
      },
      financial: {
        integrationProvider: "CONTA_AZUL",
        syncStatus: "NAO_CONFIGURADO",
        ...(typeof proposal.value === "number" ? { plannedRevenue: proposal.value } : {}),
      },
      createdAt: now,
      updatedAt: now,
    };

    if (projectSnap.exists()) {
      const patch: Partial<Proposal> = {
        ...(proposal.status !== "APROVADA" ? { status: "APROVADA" } : {}),
        ...(!proposal.projectId ? { projectId } : {}),
        ...(!proposal.sourceProjectId ? { sourceProjectId: projectId } : {}),
        ...(!proposal.approvedAt ? { approvedAt: now } : {}),
        ...(!proposal.approvedByUid ? { approvedByUid: approverUid } : {}),
        ...(!proposal.approvedByName ? { approvedByName: approverName } : {}),
      };

      if (Object.keys(patch).length > 0) {
        transaction.update(proposalRef, {
          ...patch,
          updatedAt: now,
        });
      }

      if (opportunityRef && opportunitySnap.exists()) {
        transaction.update(opportunityRef, {
          stage: "GANHA",
          updatedAt: now,
        });
      }

      return {
        projectId,
        alreadyExisted: true,
      };
    }

    transaction.set(projectRef, projectPayload);
    transaction.update(proposalRef, {
      status: "APROVADA",
      projectId,
      sourceProjectId: projectId,
      approvedAt: now,
      approvedByUid: approverUid,
      approvedByName: approverName,
      updatedAt: now,
    });
    if (opportunityRef && opportunitySnap.exists()) {
      transaction.update(opportunityRef, {
        stage: "GANHA",
        updatedAt: now,
      });
    }

    return {
      projectId,
      alreadyExisted: false,
    };
  });
}

export function getProposalsQuery() {
  return query(
    collection(db, "proposals"),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE * 50)
  );
}

export function getOpportunityProposalsQuery(opportunityId: string) {
  return query(
    collection(db, "proposals"),
    where("opportunityId", "==", opportunityId),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE * 20)
  );
}
