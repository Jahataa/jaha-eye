import type { PersistedAgentEvent } from "@jaha-eye/shared";
import { Card } from "../ui/card";

function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString();
}

function eventLabel(event: PersistedAgentEvent): string {
  switch (event.type) {
    case "RUN_STARTED":
      return "Run started";
    case "RUN_FINISHED":
      return "Run finished";
    case "RUN_ERROR":
      return `Error: ${String(event.payload.message ?? "unknown")}`;
    case "TOOL_CALL_START":
      return `Tool call: ${String(event.payload.toolCallName ?? "unknown")}`;
    case "TOOL_CALL_RESULT":
      return "Tool result received";
    case "TEXT_MESSAGE_START":
      return "Model response started";
    case "TEXT_MESSAGE_CONTENT":
      return String(event.payload.delta ?? event.payload.content ?? "…");
    default:
      return event.type;
  }
}

export function EventTimeline({ events }: { events: PersistedAgentEvent[] }) {
  if (events.length === 0) {
    return <Card className="text-muted">No events yet.</Card>;
  }

  return (
    <Card>
      <h3 className="mb-4 font-semibold">Execution timeline</h3>
      <ol className="space-y-2">
        {events.map((event) => (
          <li key={event.id} className="flex gap-3 text-sm">
            <span className="w-20 shrink-0 text-muted">{formatTime(event.timestamp)}</span>
            <span className="w-40 shrink-0 font-mono text-xs text-accent">{event.type}</span>
            <span>{eventLabel(event)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
