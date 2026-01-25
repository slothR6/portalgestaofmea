import { usePortalContext } from "../app/providers/PortalProvider";

export function usePortalStore() {
  return usePortalContext();
}
