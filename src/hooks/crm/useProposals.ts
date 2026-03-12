import { useEffect, useState } from "react";
import { onSnapshot, Query } from "firebase/firestore";
import { Proposal } from "../../types";
import { getOpportunityProposalsQuery, getProposalsQuery } from "../../services/proposals";

interface UseProposalListArgs {
  opportunityId?: string | null;
  onError?: (message: string) => void;
  enabled?: boolean;
}

export function useProposals({ opportunityId, onError, enabled = true }: UseProposalListArgs = {}) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setProposals([]);
      setLoadingProposals(false);
      return;
    }

    let proposalsQuery: Query;

    if (opportunityId) {
      proposalsQuery = getOpportunityProposalsQuery(opportunityId);
    } else {
      proposalsQuery = getProposalsQuery();
    }

    setLoadingProposals(true);
    const unsubscribe = onSnapshot(
      proposalsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((proposalDoc) => ({
          ...(proposalDoc.data() as Omit<Proposal, "id">),
          id: proposalDoc.id,
        }));
        setProposals(items);
        setLoadingProposals(false);
      },
      (error) => {
        console.error("Error loading proposals:", error);
        onError?.(error.message);
        setLoadingProposals(false);
      }
    );

    return () => unsubscribe();
  }, [enabled, opportunityId, onError]);

  return {
    proposals,
    loadingProposals,
  };
}
