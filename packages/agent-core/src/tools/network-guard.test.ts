import dns from "node:dns/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ALLOW_ALL_HOSTS, assertAllowedUrl, parseAllowedHosts } from "./network-guard.js";

describe("parseAllowedHosts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns empty set when unset", () => {
    vi.stubEnv("HTTP_ALLOWED_HOSTS", "");
    expect(parseAllowedHosts().size).toBe(0);
  });

  it("parses comma-separated hostnames", () => {
    vi.stubEnv("HTTP_ALLOWED_HOSTS", "Example.com, httpbin.org");
    expect(parseAllowedHosts()).toEqual(new Set(["example.com", "httpbin.org"]));
  });

  it("returns allow-all when set to all (case-insensitive)", () => {
    vi.stubEnv("HTTP_ALLOWED_HOSTS", " ALL ");
    expect(parseAllowedHosts()).toBe(ALLOW_ALL_HOSTS);
  });
});

describe("assertAllowedUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("denies all hosts when allowlist is empty", async () => {
    await expect(assertAllowedUrl("https://example.com", new Set())).rejects.toThrow(
      /HTTP_ALLOWED_HOSTS is not configured/,
    );
  });

  it("allows allowlisted host with public DNS answers", async () => {
    vi.spyOn(dns, "lookup").mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);
    await expect(
      assertAllowedUrl("https://example.com", new Set(["example.com"])),
    ).resolves.toBeUndefined();
  });

  it("rejects loopback DNS answers even when hostname is allowlisted", async () => {
    vi.spyOn(dns, "lookup").mockResolvedValue([{ address: "127.0.0.1", family: 4 }] as never);
    await expect(
      assertAllowedUrl("https://evil.example", new Set(["evil.example"])),
    ).rejects.toThrow(/not allowed/);
  });

  it("allows any public host when allow-all", async () => {
    vi.spyOn(dns, "lookup").mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);
    await expect(
      assertAllowedUrl("https://technopolis.bg", ALLOW_ALL_HOSTS),
    ).resolves.toBeUndefined();
  });

  it("still rejects private addresses when allow-all", async () => {
    vi.spyOn(dns, "lookup").mockResolvedValue([{ address: "10.0.0.5", family: 4 }] as never);
    await expect(assertAllowedUrl("https://internal.example", ALLOW_ALL_HOSTS)).rejects.toThrow(
      /not allowed/,
    );
    await expect(assertAllowedUrl("http://127.0.0.1", ALLOW_ALL_HOSTS)).rejects.toThrow(
      /not allowed/,
    );
  });

  it("rejects link-local IP literals in the URL", async () => {
    await expect(
      assertAllowedUrl("http://169.254.169.254", new Set(["169.254.169.254"])),
    ).rejects.toThrow(/not allowed/);
  });
});
