let warnedUnrestricted = false;

export function parseAllowedHosts(): Set<string> | null {
  const raw = process.env.HTTP_ALLOWED_HOSTS;
  if (!raw?.trim()) return null;
  return new Set(
    raw
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean),
  );
}

export function warnIfUnrestricted(): void {
  if (warnedUnrestricted || process.env.HTTP_ALLOWED_HOSTS?.trim()) return;
  warnedUnrestricted = true;
  console.warn(
    "[jaha-eye] HTTP_ALLOWED_HOSTS is unset — http_request and web_fetch may reach any host.",
  );
}

export function assertAllowedUrl(url: string, allowed: Set<string> | null): void {
  if (!allowed) return;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (!allowed.has(host)) {
    throw new Error(`Host "${host}" is not in HTTP_ALLOWED_HOSTS allowlist`);
  }
}
