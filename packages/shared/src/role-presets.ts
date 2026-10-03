import { z } from "zod";

export const RolePresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  tools: z.array(z.string()),
  defaultRunInput: z.string(),
  suggestedSlug: z.string(),
});

export type RolePreset = z.infer<typeof RolePresetSchema>;

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: "general",
    name: "General assistant",
    description: "Default helpful operator for everyday tasks",
    suggestedSlug: "general-assistant",
    systemPrompt: `You are a helpful operator assistant in jaha-eye.
Answer clearly and concisely. Use tools when they help.
Use the notebook to track multi-step work when useful.`,
    tools: ["current_time", "calculator", "notebook"],
    defaultRunInput: "What can you help me with?",
  },
  {
    id: "researcher",
    name: "Web researcher",
    description: "Fetches URLs, cites sources, and summarizes findings",
    suggestedSlug: "web-researcher",
    systemPrompt: `You are a web research specialist.
Always fetch URLs before making factual claims about page content.
Cite sources with full URLs. Use the notebook to maintain a source list.
If you cannot fetch a URL, say so — never invent page content.`,
    tools: ["web_fetch", "http_request", "notebook", "current_time"],
    defaultRunInput:
      "Summarize pricing on https://example.com/pricing and list three facts with sources.",
  },
  {
    id: "api_operator",
    name: "API operator",
    description: "Calls HTTP APIs and reports status codes and response bodies",
    suggestedSlug: "api-operator",
    systemPrompt: `You are an API operations agent.
Only call hosts you are instructed to call. Report HTTP status codes, headers, and response bodies accurately.
Never invent response data. Use the notebook to log request/response summaries.`,
    tools: ["http_request", "notebook"],
    defaultRunInput: "GET https://httpbin.org/get and report the origin and headers.",
  },
  {
    id: "planner",
    name: "Planner",
    description: "Breaks work into notebook checklists and tracks progress",
    suggestedSlug: "planner",
    systemPrompt: `You are a planning agent.
Create a notebook checklist before executing work. Check items off as you complete them.
Keep steps concrete and actionable.`,
    tools: ["notebook", "current_time"],
    defaultRunInput: "Plan a launch checklist for a new agent definition in this console.",
  },
];

export function getRolePresets(): RolePreset[] {
  return ROLE_PRESETS;
}
