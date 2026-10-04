import { z } from "zod";

export const ToolRiskSchema = z.enum(["safe", "network", "dangerous"]);
export type ToolRisk = z.infer<typeof ToolRiskSchema>;

export const ToolCategorySchema = z.enum(["utility", "network", "planning", "human"]);
export type ToolCategory = z.infer<typeof ToolCategorySchema>;

export const BuiltinToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: ToolCategorySchema,
  risk: ToolRiskSchema,
  vended: z.boolean().default(false),
});

export type BuiltinTool = z.infer<typeof BuiltinToolSchema>;

export const BUILTIN_TOOL_CATALOG: BuiltinTool[] = [
  {
    id: "current_time",
    name: "Current Time",
    description: "Returns the current date and time (UTC ISO plus human-readable local time)",
    category: "utility",
    risk: "safe",
    vended: false,
  },
  {
    id: "calculator",
    name: "Calculator",
    description: "Evaluates basic arithmetic expressions safely",
    category: "utility",
    risk: "safe",
    vended: false,
  },
  {
    id: "sleep",
    name: "Sleep",
    description: "Pauses execution for a bounded duration (default max 60s)",
    category: "utility",
    risk: "safe",
    vended: true,
  },
  {
    id: "notebook",
    name: "Notebook",
    description: "Create, read, and update persistent text notebooks for multi-step plans",
    category: "planning",
    risk: "safe",
    vended: true,
  },
  {
    id: "http_request",
    name: "HTTP Request",
    description: "Makes HTTP requests to external APIs (GET, POST, PUT, DELETE, etc.)",
    category: "network",
    risk: "network",
    vended: true,
  },
  {
    id: "web_fetch",
    name: "Web Fetch",
    description: "Fetches a URL and returns cleaned markdown for the model to read",
    category: "network",
    risk: "network",
    vended: true,
  },
];
