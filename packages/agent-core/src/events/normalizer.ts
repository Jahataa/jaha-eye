import type { BaseEvent } from "@ag-ui/core";

export interface NormalizedEvent {
  type: string;
  timestamp: Date;
  payload: Record<string, unknown>;
}

function eventTimestamp(event: BaseEvent): Date {
  if (typeof event.timestamp === "number") {
    return new Date(event.timestamp);
  }
  return new Date();
}

export function normalizeAgUiEvent(event: BaseEvent): NormalizedEvent {
  const { type, timestamp, ...rest } = event as BaseEvent & Record<string, unknown>;
  return {
    type: String(type),
    timestamp: eventTimestamp(event as BaseEvent),
    payload: { type, timestamp, ...rest },
  };
}

export function summarizeActivity(event: NormalizedEvent): string | null {
  switch (event.type) {
    case "RUN_STARTED":
      return "Run started…";
    case "RUN_FINISHED":
      return "Run finished";
    case "RUN_ERROR":
      return "Run failed";
    case "TOOL_CALL_START":
      return `Calling tool ${String(event.payload.toolCallName ?? event.payload.name ?? "…")}…`;
    case "TEXT_MESSAGE_START":
      return "Generating response…";
    case "ACTIVITY_SNAPSHOT":
      if (typeof event.payload.content === "string") {
        return event.payload.content;
      }
      return null;
    default:
      return null;
  }
}
