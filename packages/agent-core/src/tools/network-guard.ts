import dns from "node:dns/promises";

export function parseAllowedHosts(): Set<string> {
  const raw = process.env.HTTP_ALLOWED_HOSTS;
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );
}

function parseIpv4(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }
  return octets;
}

function isBlockedIpAddress(address: string): boolean {
  const ipv4 = parseIpv4(address);
  if (ipv4) {
    const [a, b] = ipv4;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 127) return true;
    return false;
  }

  const normalized = address.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80:")) return true;
  return false;
}

function assertPublicResolvedAddress(address: string): void {
  if (isBlockedIpAddress(address)) {
    throw new Error(`Resolved address "${address}" is not allowed for network tools`);
  }
}

async function assertResolvedAddressesArePublic(host: string): Promise<void> {
  if (parseIpv4(host) || host.includes(":")) {
    assertPublicResolvedAddress(host);
    return;
  }

  const records = await dns.lookup(host, { all: true, verbatim: true });
  if (records.length === 0) {
    throw new Error(`Could not resolve host "${host}"`);
  }
  for (const record of records) {
    assertPublicResolvedAddress(record.address);
  }
}

export async function assertAllowedUrl(url: string, allowed: Set<string>): Promise<void> {
  if (allowed.size === 0) {
    throw new Error("HTTP_ALLOWED_HOSTS is not configured — network tools are disabled");
  }

  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (!allowed.has(host)) {
    throw new Error(`Host "${host}" is not in HTTP_ALLOWED_HOSTS allowlist`);
  }

  await assertResolvedAddressesArePublic(host);
}

export function rejectRedirectStatus(status: number): void {
  if (status >= 300 && status < 400) {
    throw new Error("HTTP redirects are not allowed");
  }
}
