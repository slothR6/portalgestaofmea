export const nowPtBr = () => new Date().toLocaleString("pt-BR");

export function isValidDateISO(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function formatDateTime(value: number) {
  return new Date(value).toLocaleString("pt-BR");
}

export function formatDateInput(value: number) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTimeInput(value: number) {
  const date = new Date(value);
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function buildTimestamp(date: string, time: string) {
  return new Date(`${date}T${time}:00`).getTime();
}
