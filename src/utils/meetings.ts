import { Meeting } from "../types";

export function getMeetingStatusLabel(status: Meeting["status"]) {
  switch (status) {
    case "DONE":
      return "Concluída";
    case "CANCELED":
      return "Cancelada";
    default:
      return "Agendada";
  }
}

export function getMeetingStatusClasses(status: Meeting["status"]) {
  switch (status) {
    case "DONE":
      return "bg-emerald-100/70 text-emerald-700 border-emerald-200";
    case "CANCELED":
      return "bg-red-100/70 text-red-700 border-red-200";
    default:
      return "bg-blue-100/70 text-blue-700 border-blue-200";
  }
}
