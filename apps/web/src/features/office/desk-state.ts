import type { AgentRun, AgentStatus } from "@jaha-eye/shared";

export type DeskVisualState =
  | "idle"
  | "working"
  | "waiting"
  | "done"
  | "failed"
  | "disabled";

export type DeskState = {
  state: DeskVisualState;
  latestRunId: string | null;
};

export type OfficeDeskAgent = {
  id: string;
  status: AgentStatus;
};

export const DONE_STATE_FADE_MS = 45_000;

const TERMINAL_STATUSES = new Set<AgentRun["status"]>(["completed", "failed", "cancelled"]);

/** API JSON returns ISO strings; TanStack Query does not coerce to Date. */
function toEpochMs(value: Date | string | null | undefined): number {
  if (value == null) return 0;
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function runTimestamp(run: AgentRun): number {
  return toEpochMs(run.updatedAt);
}

function mapRunToDeskState(run: AgentRun, nowMs: number): DeskVisualState {
  if (run.status === "queued" || run.status === "running") return "working";
  if (run.status === "waiting") return "waiting";
  if (run.status === "completed") {
    const ended = toEpochMs(run.completedAt) || runTimestamp(run);
    return nowMs - ended <= DONE_STATE_FADE_MS ? "done" : "idle";
  }
  if (run.status === "failed") {
    const ended = toEpochMs(run.completedAt) || runTimestamp(run);
    return nowMs - ended <= DONE_STATE_FADE_MS ? "failed" : "idle";
  }
  return "idle";
}

export function deriveDeskStates(
  agents: OfficeDeskAgent[],
  runs: AgentRun[],
  nowMs: number = Date.now(),
  waitingAgentIds: ReadonlySet<string> = new Set<string>(),
  teamWorkingAgentIds: ReadonlySet<string> = new Set<string>(),
): Record<string, DeskState> {
  const latestByAgent = new Map<string, AgentRun>();

  for (const run of runs) {
    if (!run.agentId) continue;
    const existing = latestByAgent.get(run.agentId);
    if (!existing || runTimestamp(run) > runTimestamp(existing)) {
      latestByAgent.set(run.agentId, run);
    }
  }

  return Object.fromEntries(
    agents.map((agent) => {
      if (agent.status === "disabled") {
        return [agent.id, { state: "disabled" as const, latestRunId: null }];
      }

      if (waitingAgentIds.has(agent.id)) {
        const latest = latestByAgent.get(agent.id);
        return [
          agent.id,
          { state: "waiting" as const, latestRunId: latest?.id ?? null },
        ];
      }

      if (teamWorkingAgentIds.has(agent.id)) {
        const latest = latestByAgent.get(agent.id);
        return [
          agent.id,
          { state: "working" as const, latestRunId: latest?.id ?? null },
        ];
      }

      const latest = latestByAgent.get(agent.id);
      if (!latest) {
        return [agent.id, { state: "idle" as const, latestRunId: null }];
      }

      const state = mapRunToDeskState(latest, nowMs);
      const latestRunId =
        state === "idle" && TERMINAL_STATUSES.has(latest.status)
          ? null
          : latest.id;

      return [agent.id, { state, latestRunId }];
    }),
  );
}
