import type { PersistedAgentEvent } from "@jaha-eye/shared";
import { Card, CardTitle } from "../ui/card";
import { cn } from "../../lib/utils";

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

export function EventTimeline({
  events,
  live = false,
}: {
  events: PersistedAgentEvent[];
  live?: boolean;
}) {
  if (events.length === 0) {
    return (
      <Card className="text-muted">
        <CardTitle>Execution timeline</CardTitle>
        <p className="mt-4">No events yet.</p>
      </Card>
    );
  }

  const lastIndex = events.length - 1;

  return (
    <Card>
      <CardTitle>Execution timeline</CardTitle>
      <ol className="relative mt-4 space-y-0 pl-6">
        <span
          aria-hidden
          className="absolute bottom-2 left-[7px] top-2 w-px bg-accent/30"
        />
        {events.map((event, index) => {
          const isLatest = live && index === lastIndex;
          return (
            <li
              key={event.id}
              className={cn(
                "relative flex gap-3 py-2 text-sm",
                isLatest && "hud-scan-row",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute -left-6 top-3 h-2.5 w-2.5 rounded-full border border-accent bg-background shadow-[0_0_6px_rgb(125_249_255_/_0.6)]",
                  isLatest && "hud-pulse bg-accent/30",
                )}
              />
              <span className="hud-mono w-20 shrink-0 text-xs text-muted">
                {formatTime(event.timestamp)}
              </span>
              <span className="hud-mono w-44 shrink-0 text-xs text-accent">{event.type}</span>
              <span className="min-w-0 flex-1">{eventLabel(event)}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
