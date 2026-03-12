export function isValidExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}
