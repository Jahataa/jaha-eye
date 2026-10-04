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

function messageContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: unknown }).text);
        }
        return "";
      })
      .join("");
  }
  return "";
}

/** Best-effort final assistant reply from persisted AG-UI events. */
export function extractAssistantReply(events: PersistedAgentEvent[]): string | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (event.type !== "MESSAGES_SNAPSHOT") continue;

    const messages = event.payload.messages;
    if (!Array.isArray(messages)) continue;

    for (let j = messages.length - 1; j >= 0; j--) {
      const message = messages[j];
      if (!message || typeof message !== "object") continue;
      const role = (message as { role?: unknown }).role;
      const content = messageContent((message as { content?: unknown }).content).trim();
      if (role === "assistant" && content) return content;
    }
  }

  const deltas = new Map<string, string>();
  for (const event of events) {
    if (event.type !== "TEXT_MESSAGE_CONTENT") continue;
    const messageId = String(event.payload.messageId ?? "");
    const delta = String(event.payload.delta ?? event.payload.content ?? "");
    deltas.set(messageId, (deltas.get(messageId) ?? "") + delta);
  }

  const last = [...deltas.values()].at(-1)?.trim();
  return last || null;
}

export function formatToolCallResult(payload: Record<string, unknown>): string {
  const raw = payload.content ?? payload.result ?? payload.output;
  if (raw == null) return "Tool result received";
  if (typeof raw === "string") {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }
  return JSON.stringify(raw, null, 2);
}
