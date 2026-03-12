import { usePortalStore } from "./usePortalStore";

export function useUsersState() {
  const { state, actions } = usePortalStore();
  return {
    users: state.users,
    adminUids: state.adminUids,
    selectedUserProfile: state.selectedUserProfile,
    selectedProviderUid: state.selectedProviderUid,
    loadingUsers: state.loading.users,
    setUsers: actions.setUsers,
    setSelectedUserProfile: actions.setSelectedUserProfile,
    setSelectedProviderUid: actions.setSelectedProviderUid,
  };
}

export function useCompaniesState() {
  const { state, actions } = usePortalStore();
  return {
    companies: state.companies,
    loadingCompanies: state.loading.companies,
    setCompanies: actions.setCompanies,
  };
}

export function useProjectsState() {
  const { state, actions } = usePortalStore();
  return {
    projects: state.projects,
    loadingProjects: state.loading.projects,
    selectedProjectId: state.selectedProjectId,
    setProjects: actions.setProjects,
    setSelectedProjectId: actions.setSelectedProjectId,
  };
}

export function useDeliveriesState() {
  const { state, actions } = usePortalStore();
  return {
    deliveries: state.deliveries,
    loadingDeliveries: state.loading.deliveries,
    selectedDeliveryId: state.selectedDeliveryId,
    setDeliveries: actions.setDeliveries,
    setSelectedDeliveryId: actions.setSelectedDeliveryId,
  };
}

export function useMeetingsState() {
  const { state, actions } = usePortalStore();
  return {
    meetings: state.meetings,
    loadingMeetings: state.loading.meetings,
    setMeetings: actions.setMeetings,
  };
}

export function useNotificationsState() {
  const { state, actions } = usePortalStore();
  return {
    notifications: state.notifications,
    setNotifications: actions.setNotifications,
  };
}
