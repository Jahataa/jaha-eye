import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSearxngSearchUrl,
  mapSearxngResults,
  runWebSearch,
  webSearchTool,
} from "./web-search.js";

describe("buildSearxngSearchUrl", () => {
  it("builds json search URL with query and optional filters", () => {
    const url = buildSearxngSearchUrl("http://127.0.0.1:8888", {
      query: "iphone 18 pro price",
      maxResults: 5,
      language: "bg",
      timeRange: "week",
    });
    expect(url).toContain("http://127.0.0.1:8888/search?");
    expect(url).toContain("format=json");
    expect(url).toContain("q=iphone+18+pro+price");
    expect(url).toContain("language=bg");
    expect(url).toContain("time_range=week");
  });
});

describe("mapSearxngResults", () => {
  it("maps and trims results to maxResults", () => {
    const mapped = mapSearxngResults(
      {
        query: "test",
        results: [
          { title: "A", url: "https://a.test", content: "one", engine: "google" },
          { title: "B", url: "https://b.test", content: "two", engine: "bing" },
          { title: "C", url: "https://c.test", content: "three", engine: "duckduckgo" },
        ],
      },
      2,
    );
    expect(mapped.query).toBe("test");
    expect(mapped.results).toHaveLength(2);
    expect(mapped.results[0]).toEqual({
      title: "A",
      url: "https://a.test",
      snippet: "one",
      engine: "google",
    });
  });

  it("rejects invalid payload", () => {
    expect(() => mapSearxngResults(null, 5)).toThrow(/invalid JSON/);
  });
});

describe("runWebSearch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("errors when SEARXNG_URL is unset", async () => {
    vi.stubEnv("SEARXNG_URL", "");
    await expect(runWebSearch({ query: "test", maxResults: 8 })).rejects.toThrow(
      /SEARXNG_URL is not configured/,
    );
  });

  it("returns mapped JSON on success", async () => {
    vi.stubEnv("SEARXNG_URL", "http://127.0.0.1:8888");
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          query: "technopolis",
          results: [{ title: "Shop", url: "https://technopolis.bg", content: "phones", engine: "google" }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const out = await runWebSearch({ query: "technopolis iphone", maxResults: 8 });
    expect(JSON.parse(out).results[0].url).toBe("https://technopolis.bg");
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toMatch(/format=json/);
  });

  it("surfaces 403 when json format is disabled", async () => {
    vi.stubEnv("SEARXNG_URL", "http://127.0.0.1:8888");
    vi.mocked(fetch).mockResolvedValue(new Response("Forbidden", { status: 403 }));

    await expect(runWebSearch({ query: "test", maxResults: 8 })).rejects.toThrow(/403/);
    await expect(runWebSearch({ query: "test", maxResults: 8 })).rejects.toThrow(/json/);
  });

  it("surfaces timeout errors", async () => {
    vi.stubEnv("SEARXNG_URL", "http://127.0.0.1:8888");
    vi.mocked(fetch).mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) return;
        if (signal.aborted) {
          reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
          return;
        }
        signal.addEventListener("abort", () => {
          reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
        });
      });
    });

    await expect(
      runWebSearch({ query: "slow", maxResults: 8 }, { timeoutMs: 25 }),
    ).rejects.toThrow(/timed out/);
  });
});

describe("webSearchTool", () => {
  it("is registered with invoke", async () => {
    vi.stubEnv("SEARXNG_URL", "http://127.0.0.1:8888");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ query: "x", results: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const out = await webSearchTool.invoke({ query: "hello", maxResults: 3 });
    expect(JSON.parse(out).results).toEqual([]);
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
});
