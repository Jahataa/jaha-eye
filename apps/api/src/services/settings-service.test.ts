import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@jaha-eye/database", () => ({
  prisma: {
    appSettings: {
      findUnique: vi.fn(async () => null),
    },
  },
}));

describe("testConnection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does not return upstream error bodies", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => "secret upstream diagnostic",
      })) as unknown as typeof fetch,
    );

    const { testConnection } = await import("./settings-service.js");
    const result = await testConnection({ baseUrl: "http://localhost:11434/v1" });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Connection test failed");
    expect(result.error).not.toContain("secret upstream");
  });

  it("treats redirects as generic failures", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 302,
        text: async () => "",
      })) as unknown as typeof fetch,
    );

    const { testConnection } = await import("./settings-service.js");
    const result = await testConnection({ baseUrl: "http://localhost:11434/v1" });

    expect(result).toEqual({ ok: false, error: "Connection test failed" });
  });

  it("rejects non-loopback http base URLs", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { testConnection } = await import("./settings-service.js");
    const result = await testConnection({ baseUrl: "http://192.168.0.2/v1" });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("Model base URL is not allowed");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
