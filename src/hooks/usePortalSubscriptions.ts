import { useAdminDataSubscriptions } from "./portalSubscriptions/useAdminDataSubscriptions";
import { useOperationalDataSubscriptions } from "./portalSubscriptions/useOperationalDataSubscriptions";
import { PortalSubscriptionsArgs } from "./portalSubscriptions/types";
import { useUserDataSubscriptions } from "./portalSubscriptions/useUserDataSubscriptions";

export function usePortalSubscriptions(args: PortalSubscriptionsArgs) {
  useAdminDataSubscriptions(args);
  useOperationalDataSubscriptions(args);
  useUserDataSubscriptions(args);
}
