import { z } from "zod";

export const RunStatusSchema = z.enum([
  "queued",
  "running",
  "waiting",
  "completed",
  "failed",
  "cancelled",
]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

export const RunTriggerSchema = z.enum(["manual"]);
export type RunTrigger = z.infer<typeof RunTriggerSchema>;

export const AgentRunSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid().nullable(),
  orchestrationId: z.string().uuid().nullable(),
  graphNodeId: z.string().nullable(),
  parentRunId: z.string().uuid().nullable(),
  status: RunStatusSchema,
  trigger: RunTriggerSchema,
  input: z.unknown(),
  output: z.unknown().nullable(),
  error: z
    .object({
      message: z.string(),
      stack: z.string().optional(),
    })
    .nullable(),
  startedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type AgentRun = z.infer<typeof AgentRunSchema>;

export const RunChildSummarySchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid().nullable(),
  graphNodeId: z.string().nullable(),
  status: RunStatusSchema,
});

export type RunChildSummary = z.infer<typeof RunChildSummarySchema>;

export const AgentRunDetailSchema = AgentRunSchema.extend({
  children: z.array(RunChildSummarySchema).optional(),
});

export type AgentRunDetail = z.infer<typeof AgentRunDetailSchema>;

export const StartRunSchema = z.object({
  input: z.string().default("Hello"),
});

export type StartRunInput = z.infer<typeof StartRunSchema>;

export const StartRunResponseSchema = z.object({
  runId: z.string().uuid(),
});
