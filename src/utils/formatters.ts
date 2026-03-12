export function formatCurrency(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Nao informado";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDateTime(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Nao informado";
  return new Date(value).toLocaleString("pt-BR");
}

export function formatDate(value?: number | string | null) {
  if (!value) return "Nao informado";

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("pt-BR");
  }

  return new Date(value).toLocaleDateString("pt-BR");
}
