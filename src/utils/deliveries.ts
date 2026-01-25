import { Progress, Status } from "../types";

export function resolveProgress(status: Status, progress?: Progress) {
  if (progress) return progress;
  switch (status) {
    case "APROVADO":
      return "APROVADO";
    case "REVISAO":
      return "REVISAO";
    case "AJUSTES":
      return "FAZENDO";
    default:
      return "A_FAZER";
  }
}
