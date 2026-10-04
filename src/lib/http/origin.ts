export function getSafeNextPath(nextParam?: string | null): string {
  if (!nextParam) {
    return "/";
  }

  const trimmed = nextParam.trim();

  // Must start with '/'
  if (!trimmed.startsWith("/")) {
    return "/";
  }

  // Must not start with protocol-relative '//', '/\', or contain backslashes
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\") || trimmed.includes("\\")) {
    return "/";
  }

  try {
    const dummyOrigin = "http://localhost";
    const parsed = new URL(trimmed, dummyOrigin);

    // If parsing resulted in a different origin, it was an absolute URL
    if (parsed.origin !== dummyOrigin) {
      return "/";
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}
