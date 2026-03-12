export function sanitize(value: string) {
  return (value || "").trim().replace(/\s+/g, " ");
}
