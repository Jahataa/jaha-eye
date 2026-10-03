import { useEffect, useState } from "react";
import type { PersistedAgentEvent } from "@jaha-eye/shared";

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

export function useRunStream(runId: string | undefined, runStatus: string | undefined) {
  const [liveEvents, setLiveEvents] = useState<PersistedAgentEvent[]>([]);
  const [activity, setActivity] = useState<string | null>(null);

  useEffect(() => {
    if (!runId || !runStatus || TERMINAL.has(runStatus)) return;

    const source = new EventSource(`/api/runs/${runId}/stream`);

    source.onmessage = (msg) => {
      const event = JSON.parse(msg.data) as PersistedAgentEvent;
      setLiveEvents((prev) => {
        if (prev.some((e) => e.sequence === event.sequence)) return prev;
        return [...prev, event];
      });

      if (event.type === "TOOL_CALL_START") {
        const name = String(event.payload.toolCallName ?? "tool");
        setActivity(`Calling ${name}…`);
      } else if (event.type === "TEXT_MESSAGE_START") {
        setActivity("Generating response…");
      } else if (event.type === "RUN_FINISHED") {
        setActivity("Run finished");
      } else if (event.type === "RUN_ERROR") {
        setActivity("Run failed");
      }
    };

    source.onerror = () => source.close();

    return () => source.close();
  }, [runId, runStatus]);

  return { liveEvents, activity };
}
