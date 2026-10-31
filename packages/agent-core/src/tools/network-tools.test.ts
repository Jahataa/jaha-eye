import { afterEach, describe, expect, it, vi } from "vitest";
import { guardedWebFetch } from "./network-tools.js";

describe("guardedWebFetch", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads HTTP_ALLOWED_HOSTS at call time, not import time", async () => {
    vi.stubEnv("HTTP_ALLOWED_HOSTS", "example.com");
    await expect(
      guardedWebFetch.invoke({ url: "https://not-allowed.test/" }),
    ).rejects.toThrow(/not in HTTP_ALLOWED_HOSTS allowlist/);
  });
});
