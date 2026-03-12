import { useEffect, useState } from "react";
import { onSnapshot, Query } from "firebase/firestore";
import { Opportunity } from "../../types";
import { getCompanyOpportunitiesQuery, getOpportunitiesQuery } from "../../services/opportunities";

interface UseOpportunityListArgs {
  companyId?: string | null;
  onError?: (message: string) => void;
  enabled?: boolean;
}

export function useOpportunities({ companyId, onError, enabled = true }: UseOpportunityListArgs = {}) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setOpportunities([]);
      setLoadingOpportunities(false);
      return;
    }

    let opportunitiesQuery: Query;

    if (companyId) {
      opportunitiesQuery = getCompanyOpportunitiesQuery(companyId);
    } else {
      opportunitiesQuery = getOpportunitiesQuery();
    }

    setLoadingOpportunities(true);
    const unsubscribe = onSnapshot(
      opportunitiesQuery,
      (snapshot) => {
        const items = snapshot.docs.map((opportunityDoc) => ({
          ...(opportunityDoc.data() as Omit<Opportunity, "id">),
          id: opportunityDoc.id,
        }));
        setOpportunities(items);
        setLoadingOpportunities(false);
      },
      (error) => {
        console.error("Error loading opportunities:", error);
        onError?.(error.message);
        setLoadingOpportunities(false);
      }
    );

    return () => unsubscribe();
  }, [companyId, enabled, onError]);

  return {
    opportunities,
    loadingOpportunities,
  };
}
