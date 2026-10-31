import { tool } from "@strands-agents/sdk";
import { z } from "zod";

export const WEB_SEARCH_TIMEOUT_MS = 15_000;

const webSearchInputSchema = z.object({
  query: z.string().min(1).describe("Search query"),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(8)
    .describe("Maximum number of results to return (1–20)"),
  language: z
    .string()
    .optional()
    .describe("Optional language code (e.g. en, bg) passed to the search engine"),
  timeRange: z
    .enum(["day", "week", "month", "year"])
    .optional()
    .describe("Optional recency filter"),
});

export type WebSearchInput = z.infer<typeof webSearchInputSchema>;

export type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
  engine: string;
};

export function resolveSearxngBaseUrl(): string {
  const raw = process.env.SEARXNG_URL?.trim();
  if (!raw) {
    throw new Error(
      "SEARXNG_URL is not configured — start SearXNG with: docker compose -f docker-compose.yml -f docker-compose.tools.yml up -d",
    );
  }
  return raw.replace(/\/+$/, "");
}

export function buildSearxngSearchUrl(baseUrl: string, input: WebSearchInput): string {
  const params = new URLSearchParams({
    q: input.query,
    format: "json",
  });
  if (input.language?.trim()) {
    params.set("language", input.language.trim());
  }
  if (input.timeRange) {
    params.set("time_range", input.timeRange);
  }
  return `${baseUrl}/search?${params.toString()}`;
}

export function mapSearxngResults(
  payload: unknown,
  maxResults: number,
): { query: string; results: WebSearchResult[] } {
  if (!payload || typeof payload !== "object") {
    throw new Error("SearXNG returned an invalid JSON response");
  }

  const record = payload as Record<string, unknown>;
  const query = typeof record.query === "string" ? record.query : "";
  const rawResults = Array.isArray(record.results) ? record.results : [];

  const results: WebSearchResult[] = [];
  for (const item of rawResults) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const url = typeof row.url === "string" ? row.url : "";
    const title = typeof row.title === "string" ? row.title : "";
    if (!url || !title) continue;

    const snippet =
      typeof row.content === "string"
        ? row.content
        : typeof row.snippet === "string"
          ? row.snippet
          : "";
    const engine = typeof row.engine === "string" ? row.engine : "";

    results.push({ title, url, snippet, engine });
    if (results.length >= maxResults) break;
  }

  return { query, results };
}

function searxngErrorMessage(status: number): string {
  if (status === 403) {
    return "SearXNG rejected the request (HTTP 403) — ensure search.formats includes json in docker/searxng/settings.yml";
  }
  return `SearXNG search failed with HTTP ${status}`;
}

export async function runWebSearch(
  input: WebSearchInput,
  options?: { timeoutMs?: number },
): Promise<string> {
  const baseUrl = resolveSearxngBaseUrl();
  const url = buildSearxngSearchUrl(baseUrl, input);
  const maxResults = input.maxResults ?? 8;
  const timeoutMs = options?.timeoutMs ?? WEB_SEARCH_TIMEOUT_MS;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "manual",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(searxngErrorMessage(response.status));
    }

    const payload: unknown = await response.json();
    const mapped = mapSearxngResults(payload, maxResults);
    return JSON.stringify(mapped, null, 2);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`SearXNG search timed out after ${timeoutMs / 1000}s`);
    }
    if (error instanceof TypeError && /fetch failed|ECONNREFUSED/i.test(String(error.message))) {
      throw new Error(
        `Cannot reach SearXNG at ${baseUrl} — is the container running? (docker compose -f docker-compose.yml -f docker-compose.tools.yml up -d)`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const webSearchTool = tool({
  name: "web_search",
  description:
    "Searches the public web via the local SearXNG instance and returns titles, URLs, and snippets. Use web_fetch on result URLs to read full page content.",
  inputSchema: webSearchInputSchema,
  callback: async (input) => runWebSearch(input),
});
