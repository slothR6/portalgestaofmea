import { useMemo } from "react";
import { useResolvedAppRoute } from "../app/router/useResolvedAppRoute";
import { useDeliveriesState, useProjectsState } from "./usePortalCollections";

export function useProjectDetailState() {
  const route = useResolvedAppRoute();
  const { projects, selectedProjectId } = useProjectsState();

  const routeProjectId = route.view === "DETALHE_PROJETO" ? route.params.projectId || null : null;
  const projectId = routeProjectId || selectedProjectId;
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId) || null,
    [projects, projectId]
  );

  return {
    routeProjectId,
    projectId,
    selectedProject,
  };
}

export function useDeliveryDetailState() {
  const route = useResolvedAppRoute();
  const { deliveries, selectedDeliveryId } = useDeliveriesState();

  const routeDeliveryId = route.view === "DETALHE_ENTREGA" ? route.params.deliveryId || null : null;
  const deliveryId = routeDeliveryId || selectedDeliveryId;
  const selectedDelivery = useMemo(
    () => deliveries.find((delivery) => delivery.id === deliveryId) || null,
    [deliveries, deliveryId]
  );

  return {
    routeDeliveryId,
    deliveryId,
    selectedDelivery,
  };
}
