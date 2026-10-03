import type { Tool } from "@strands-agents/sdk";
import { BUILTIN_TOOL_CATALOG } from "@jaha-eye/shared";
import { currentTimeTool } from "./current-time.js";

const TOOL_MAP: Record<string, Tool> = {
  current_time: currentTimeTool,
};

export function getBuiltinToolCatalog() {
  return BUILTIN_TOOL_CATALOG;
}

export function resolveTools(toolIds: string[]): Tool[] {
  return toolIds
    .map((id) => TOOL_MAP[id])
    .filter((t): t is Tool => t !== undefined);
}
