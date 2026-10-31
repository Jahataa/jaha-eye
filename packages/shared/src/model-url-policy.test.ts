import { describe, expect, it } from "vitest";
import { assertModelBaseUrlAllowed } from "./model-url-policy.js";

describe("assertModelBaseUrlAllowed", () => {
  it("allows public https endpoints", () => {
    expect(() => assertModelBaseUrlAllowed("https://api.openai.com/v1")).not.toThrow();
  });

  it("allows loopback http for Ollama", () => {
    expect(() => assertModelBaseUrlAllowed("http://localhost:11434/v1")).not.toThrow();
    expect(() => assertModelBaseUrlAllowed("http://127.0.0.1:11434/v1")).not.toThrow();
  });

  it("rejects metadata and file URLs", () => {
    expect(() => assertModelBaseUrlAllowed("https://metadata.google.internal")).toThrow();
    expect(() => assertModelBaseUrlAllowed("file:///etc/passwd")).toThrow();
  });

  it("rejects non-loopback http and private https hosts", () => {
    expect(() => assertModelBaseUrlAllowed("http://192.168.1.10/v1")).toThrow();
    expect(() => assertModelBaseUrlAllowed("https://192.168.1.10/v1")).toThrow();
    expect(() => assertModelBaseUrlAllowed("https://10.0.0.5/v1")).toThrow();
  });
});
