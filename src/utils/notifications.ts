import { AppNotification } from "../types";

export function getNotificationLocation(type: AppNotification["type"]) {
  switch (type) {
    case "MEETING":
      return "Reuniões";
    case "COMMENT":
    case "SUBMITTED":
    case "APPROVED":
    case "ADJUST_REQUESTED":
    case "NEW_DELIVERY":
    case "STARTED":
    case "DEADLINE_CHANGE_REQUESTED":
    case "DEADLINE_CHANGE_APPROVED":
    case "DEADLINE_CHANGE_REJECTED":
      return "Entregas";
    default:
      return "Dashboard";
  }
}
