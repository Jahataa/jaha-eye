import { useEffect, useState } from "react";
import type { PersistedAgentEvent } from "@jaha-eye/shared";
import { useUiStore } from "../stores/ui-store";

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

type UseRunStreamOptions = {
  agentNames?: Record<string, string>;
};

function nodeLabel(agentId: string | undefined, agentNames?: Record<string, string>): string {
  if (agentId && agentNames?.[agentId]) return agentNames[agentId];
  if (agentId) return agentId.slice(0, 8);
  return "Node";
}

export function useRunStream(
  runId: string | undefined,
  runStatus: string | undefined,
  options?: UseRunStreamOptions,
) {
  const [liveEvents, setLiveEvents] = useState<PersistedAgentEvent[]>([]);
  const [activity, setActivityLocal] = useState<string | null>(null);
  const setActivity = useUiStore((s) => s.setActivity);
  const agentNames = options?.agentNames;

  useEffect(() => {
    if (!runId || !runStatus || TERMINAL.has(runStatus)) {
      setActivity(null);
      return;
    }

    const source = new EventSource(`/api/runs/${runId}/stream`);

    source.onmessage = (msg) => {
      const event = JSON.parse(msg.data) as PersistedAgentEvent;
      setLiveEvents((prev) => {
        if (prev.some((e) => e.sequence === event.sequence)) return prev;
        return [...prev, event];
      });

      const payload = event.payload as Record<string, unknown>;
      let nextActivity: string | null = null;

      if (event.type === "TOOL_CALL_START") {
        const name = String(payload.toolCallName ?? "tool");
        nextActivity = `Calling ${name}…`;
      } else if (event.type === "TEXT_MESSAGE_START") {
        nextActivity = "Generating response…";
      } else if (event.type === "NODE_STARTED") {
        const agentId = String(payload.agentId ?? "");
        nextActivity = `${nodeLabel(agentId, agentNames)} running…`;
      } else if (event.type === "NODE_FINISHED") {
        const agentId = String(payload.agentId ?? "");
        nextActivity = `${nodeLabel(agentId, agentNames)} finished`;
      } else if (event.type === "NODE_ERROR") {
        const agentId = String(payload.agentId ?? "");
        nextActivity = `${nodeLabel(agentId, agentNames)} failed`;
      } else if (event.type === "RUN_FINISHED") {
        nextActivity = "Run finished";
      } else if (event.type === "RUN_ERROR") {
        nextActivity = "Run failed";
      }

      if (nextActivity) {
        setActivityLocal(nextActivity);
        setActivity(nextActivity);
      }
    };

    source.onerror = () => source.close();

    return () => {
      source.close();
      setActivity(null);
    };
  }, [runId, runStatus, setActivity, agentNames]);

  return { liveEvents, activity };
}
