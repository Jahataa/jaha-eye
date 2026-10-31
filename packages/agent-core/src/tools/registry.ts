import type { Tool } from "@strands-agents/sdk";
import { notebook } from "@strands-agents/sdk/vended-tools/notebook";
import { sleep } from "@strands-agents/sdk/vended-tools/sleep";
import { BUILTIN_TOOL_CATALOG } from "@jaha-eye/shared";
import { calculatorTool } from "./calculator.js";
import { currentTimeTool } from "./current-time.js";
import { guardedHttpRequest, guardedWebFetch } from "./network-tools.js";
import { webSearchTool } from "./web-search.js";

const TOOL_MAP: Record<string, Tool> = {
  current_time: currentTimeTool,
  calculator: calculatorTool,
  sleep,
  notebook,
  http_request: guardedHttpRequest,
  web_fetch: guardedWebFetch,
  web_search: webSearchTool,
};

export function getBuiltinToolCatalog() {
  return BUILTIN_TOOL_CATALOG;
}

export function resolveTools(toolIds: string[]): Tool[] {
  return toolIds
    .map((id) => TOOL_MAP[id])
    .filter((t): t is Tool => t !== undefined);
}
