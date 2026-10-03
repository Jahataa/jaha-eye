import { z } from "zod";

export const PersistedAgentEventSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  sequence: z.number().int(),
  type: z.string(),
  timestamp: z.coerce.date(),
  payload: z.record(z.unknown()),
});

export type PersistedAgentEvent = z.infer<typeof PersistedAgentEventSchema>;

export const AgUiEventPayloadSchema = z.object({
  type: z.string(),
  timestamp: z.number().optional(),
}).passthrough();

export type AgUiEventPayload = z.infer<typeof AgUiEventPayloadSchema>;
