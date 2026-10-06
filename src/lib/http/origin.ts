/**
 * Helper to ensure `next` query parameters are safe internal relative paths,
 * preventing open redirect vulnerabilities (e.g. `//evil.com` or `https://attacker.com`).
 */
export function getSafeNextPath(nextParam: string | null | undefined, fallback = "/"): string {
  if (!nextParam) return fallback;

  const trimmed = nextParam.trim();

  // Must start with '/' and not '//' or '/\'
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes(":")
  ) {
    return trimmed;
  }

  return fallback;
}
