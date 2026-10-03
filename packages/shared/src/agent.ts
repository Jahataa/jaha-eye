import { z } from "zod";

export const AgentStatusSchema = z.enum(["active", "disabled"]);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AgentDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable(),
  status: AgentStatusSchema,
  modelProvider: z.string().default("openai"),
  modelName: z.string().default("gpt-4o-mini"),
  modelBaseUrl: z.string().nullable(),
  modelTemperature: z.number().min(0).max(2).default(0.7),
  systemPrompt: z.string().default("You are a helpful assistant."),
  tools: z.array(z.string()).default([]),
  defaultRunInput: z.string().nullable(),
  maxConcurrentRuns: z.number().int().positive().default(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

export const CreateAgentSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  modelProvider: z.string().default("openai"),
  modelName: z.string().default("gpt-4o-mini"),
  modelBaseUrl: z.string().url().optional().nullable(),
  modelTemperature: z.number().min(0).max(2).default(0.7),
  systemPrompt: z.string().default("You are a helpful assistant."),
  tools: z.array(z.string()).default([]),
  defaultRunInput: z.string().optional().nullable(),
  maxConcurrentRuns: z.number().int().positive().default(1),
});

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;

export const UpdateAgentSchema = CreateAgentSchema.partial();
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;
