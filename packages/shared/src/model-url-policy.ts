const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const BLOCKED_METADATA_HOSTS = new Set(["metadata.google.internal", "metadata.goog"]);

function parseIpv4(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }
  return octets;
}

function isPrivateOrLinkLocalIpv4(octets: number[]): boolean {
  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 127) return true;
  return false;
}

function isPrivateOrLinkLocalIp(host: string): boolean {
  const ipv4 = parseIpv4(host);
  if (ipv4) {
    return isPrivateOrLinkLocalIpv4(ipv4);
  }

  const normalized = host.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80:")) return true;
  return false;
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.toLowerCase();
  if (LOOPBACK_HOSTS.has(normalized)) return true;
  const ipv4 = parseIpv4(normalized);
  if (ipv4 && ipv4[0] === 127) return true;
  return normalized === "::1";
}

export function assertModelBaseUrlAllowed(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid model base URL");
  }

  if (parsed.protocol === "file:") {
    throw new Error("Model base URL must not use the file protocol");
  }

  const host = parsed.hostname.toLowerCase();

  if (BLOCKED_METADATA_HOSTS.has(host)) {
    throw new Error("Model base URL host is not allowed");
  }

  if (parsed.protocol === "http:") {
    if (!isLoopbackHost(host)) {
      throw new Error("Model base URL http is only allowed for loopback hosts");
    }
    return;
  }

  if (parsed.protocol === "https:") {
    if (isLoopbackHost(host) || isPrivateOrLinkLocalIp(host)) {
      throw new Error("Model base URL https must use a public host");
    }
    return;
  }

  throw new Error("Model base URL must use http or https");
}

export function modelBaseUrlRefinement(value: string, ctx: { addIssue: (issue: { code: "custom"; message: string }) => void }): void {
  try {
    assertModelBaseUrlAllowed(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Model base URL is not allowed";
    ctx.addIssue({ code: "custom", message });
  }
}
