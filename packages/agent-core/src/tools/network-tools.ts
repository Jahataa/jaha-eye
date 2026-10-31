import { tool } from "@strands-agents/sdk";
import { httpRequest } from "@strands-agents/sdk/vended-tools/http-request";
import { webFetch } from "@strands-agents/sdk/vended-tools/web-fetch";
import { z } from "zod";
import { assertAllowedUrl, parseAllowedHosts, rejectRedirectStatus } from "./network-guard.js";

const httpInputSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  timeout: z.number().positive().optional(),
});

async function guardedFetch(
  url: string,
  init: RequestInit & { signal?: AbortSignal },
): Promise<Response> {
  await assertAllowedUrl(url, parseAllowedHosts());
  const response = await fetch(url, { ...init, redirect: "manual" });
  rejectRedirectStatus(response.status);
  return response;
}

export const guardedHttpRequest = tool({
  name: "http_request",
  description: httpRequest.description,
  inputSchema: httpInputSchema,
  callback: async (input) => {
    const controller = new AbortController();
    const timeoutMs = input.timeout ?? 30_000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await guardedFetch(input.url, {
        method: input.method,
        headers: input.headers,
        body: input.body,
        signal: controller.signal,
      });

      const bodyText = await response.text();
      return JSON.stringify(
        {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: bodyText,
        },
        null,
        2,
      );
    } finally {
      clearTimeout(timeout);
    }
  },
});

const webFetchInputSchema = z.object({
  url: z.string().url(),
  prompt: z.string().optional(),
});

export const guardedWebFetch = tool({
  name: "web_fetch",
  description: webFetch.description,
  inputSchema: webFetchInputSchema,
  callback: async (input) => {
    const response = await guardedFetch(input.url, { method: "GET" });
    if (!response.ok) {
      throw new Error(`Fetch failed with HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "text/plain";
    const body = await response.text();
    const prompt = input.prompt?.trim();

    return JSON.stringify(
      {
        url: input.url,
        contentType,
        ...(prompt ? { prompt } : {}),
        content: body.slice(0, 100_000),
      },
      null,
      2,
    );
  },
});
