import { describe, expect, it } from "vitest";
import type { AgentRun } from "@jaha-eye/shared";
import { deriveDeskStates, DONE_STATE_FADE_MS } from "./desk-state";

const agentA = { id: "00000000-0000-4000-8000-000000000001", status: "active" as const };
const agentB = { id: "00000000-0000-4000-8000-000000000002", status: "disabled" as const };

function run(
  partial: Partial<AgentRun> & Pick<AgentRun, "id" | "agentId" | "status">,
): AgentRun {
  const now = new Date("2026-01-01T12:00:00.000Z");
  return {
    orchestrationId: null,
    graphNodeId: null,
    parentRunId: null,
    trigger: "manual",
    input: {},
    output: null,
    error: null,
    startedAt: now,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

describe("deriveDeskStates", () => {
  const nowMs = Date.parse("2026-01-01T12:00:00.000Z");

  it("marks disabled agents as disabled", () => {
    const states = deriveDeskStates([agentB], [], nowMs);
    expect(states[agentB.id]?.state).toBe("disabled");
  });

  it("uses the latest run per agent", () => {
    const states = deriveDeskStates(
      [agentA],
      [
        run({
          id: "10000000-0000-4000-8000-000000000001",
          agentId: agentA.id,
          status: "completed",
          updatedAt: new Date("2026-01-01T11:00:00.000Z"),
          completedAt: new Date("2026-01-01T11:00:00.000Z"),
        }),
        run({
          id: "10000000-0000-4000-8000-000000000002",
          agentId: agentA.id,
          status: "running",
          updatedAt: new Date("2026-01-01T11:30:00.000Z"),
        }),
      ],
      nowMs,
    );
    expect(states[agentA.id]?.state).toBe("working");
    expect(states[agentA.id]?.latestRunId).toBe("10000000-0000-4000-8000-000000000002");
  });

  it("lights orchestration child runs by agent id", () => {
    const states = deriveDeskStates(
      [agentA],
      [
        run({
          id: "10000000-0000-4000-8000-000000000003",
          agentId: agentA.id,
          status: "running",
          parentRunId: "20000000-0000-4000-8000-000000000001",
          orchestrationId: "30000000-0000-4000-8000-000000000001",
        }),
      ],
      nowMs,
    );
    expect(states[agentA.id]?.state).toBe("working");
  });

  it("accepts ISO date strings from JSON API responses", () => {
    const states = deriveDeskStates(
      [agentA],
      [
        run({
          id: "10000000-0000-4000-8000-000000000005",
          agentId: agentA.id,
          status: "running",
          updatedAt: "2026-01-01T12:00:00.000Z" as unknown as Date,
        }),
      ],
      nowMs,
    );
    expect(states[agentA.id]?.state).toBe("working");
  });

  it("prefers approval waiting over idle when waitingAgentIds is set", () => {
    const states = deriveDeskStates([agentA], [], nowMs, new Set([agentA.id]));
    expect(states[agentA.id]?.state).toBe("waiting");
  });

  it("marks team piece agents as working when teamWorkingAgentIds is set", () => {
    const states = deriveDeskStates([agentA], [], nowMs, new Set(), new Set([agentA.id]));
    expect(states[agentA.id]?.state).toBe("working");
  });

  it("fades completed runs back to idle after the window", () => {
    const completedAt = new Date(nowMs - DONE_STATE_FADE_MS - 1);
    const states = deriveDeskStates(
      [agentA],
      [
        run({
          id: "10000000-0000-4000-8000-000000000004",
          agentId: agentA.id,
          status: "completed",
          completedAt,
          updatedAt: completedAt,
        }),
      ],
      nowMs,
    );
    expect(states[agentA.id]?.state).toBe("idle");
    expect(states[agentA.id]?.latestRunId).toBeNull();
  });
});
