import { tool } from "@strands-agents/sdk";
import { httpRequest } from "@strands-agents/sdk/vended-tools/http-request";
import { webFetch } from "@strands-agents/sdk/vended-tools/web-fetch";
import { z } from "zod";
import { assertAllowedUrl, parseAllowedHosts, warnIfUnrestricted } from "./network-guard.js";

const allowedHosts = parseAllowedHosts();
warnIfUnrestricted();

const httpInputSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  timeout: z.number().positive().optional(),
});

export const guardedHttpRequest = tool({
  name: "http_request",
  description: httpRequest.description,
  inputSchema: httpInputSchema,
  callback: async (input, context) => {
    assertAllowedUrl(input.url, allowedHosts);
    return httpRequest.invoke(input, context);
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
  callback: async (input, context) => {
    assertAllowedUrl(input.url, allowedHosts);
    return webFetch.invoke(input, context);
  },
});
