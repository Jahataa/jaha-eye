import { prisma, type Prisma } from "@jaha-eye/database";
import {
  AgentFactory,
  StrandsRuntime,
  type NormalizedEvent,
} from "@jaha-eye/agent-core";
import type { AgentDefinition, PersistedAgentEvent } from "@jaha-eye/shared";
import { eventBus } from "./event-bus.js";
import { getEffectiveLlmConfig } from "./settings-service.js";
import { mapAgent, mapEvent } from "../lib/mappers.js";

const factory = new AgentFactory({
  resolveLlmDefaults: getEffectiveLlmConfig,
});

export const runtime = new StrandsRuntime(factory);

/** Serializes event persistence per run so parallel orchestration nodes cannot collide on sequence. */
const persistQueues = new Map<string, Promise<void>>();

async function nextSequence(runId: string): Promise<number> {
  const last = await prisma.agentRunEvent.findFirst({
    where: { runId },
    orderBy: { sequence: "desc" },
    select: { sequence: true },
  });
  return (last?.sequence ?? 0) + 1;
}

async function persistRunEventInner(
  runId: string,
  normalized: NormalizedEvent,
): Promise<PersistedAgentEvent> {
  const sequence = await nextSequence(runId);
  const row = await prisma.agentRunEvent.create({
    data: {
      runId,
      sequence,
      type: normalized.type,
      timestamp: normalized.timestamp,
      payload: normalized.payload as Prisma.InputJsonValue,
    },
  });
  const persisted = mapEvent(row);
  eventBus.publish(runId, persisted);
  return persisted;
}

export function persistRunEvent(
  runId: string,
  normalized: NormalizedEvent,
): Promise<PersistedAgentEvent> {
  const previous = persistQueues.get(runId) ?? Promise.resolve();

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  persistQueues.set(runId, previous.then(() => gate));

  return previous.then(async () => {
    try {
      return await persistRunEventInner(runId, normalized);
    } finally {
      release();
      if (persistQueues.get(runId) === gate) {
        persistQueues.delete(runId);
      }
    }
  });
}

export async function executeRun(
  runId: string,
  definition: AgentDefinition,
  message: string,
): Promise<void> {
  await prisma.agentRun.update({
    where: { id: runId },
    data: { status: "running", startedAt: new Date() },
  });

  try {
    for await (const event of runtime.stream(definition, { runId, message })) {
      await persistRunEvent(runId, event);

      if (event.type === "RUN_FINISHED") {
        await prisma.agentRun.update({
          where: { id: runId },
          data: {
            status: "completed",
            completedAt: new Date(),
            output: event.payload as Prisma.InputJsonValue,
          },
        });
      }

      if (event.type === "RUN_ERROR") {
        await prisma.agentRun.update({
          where: { id: runId },
          data: {
            status: "failed",
            completedAt: new Date(),
            error: {
              message: String(event.payload.message ?? "Run failed"),
            },
          },
        });
      }
    }

    const current = await prisma.agentRun.findUnique({ where: { id: runId } });
    if (current && current.status === "running") {
      await prisma.agentRun.update({
        where: { id: runId },
        data: { status: "completed", completedAt: new Date() },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await persistRunEvent(runId, {
      type: "RUN_ERROR",
      timestamp: new Date(),
      payload: { type: "RUN_ERROR", message },
    });
    await prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: "failed",
        completedAt: new Date(),
        error: { message },
      },
    });
  } finally {
    eventBus.close(runId);
  }
}

export async function startRun(agentId: string, input: string): Promise<string> {
  const agent = await prisma.agent.findUniqueOrThrow({ where: { id: agentId } });
  if (agent.status === "disabled") {
    throw new Error("Agent is disabled");
  }

  const run = await prisma.agentRun.create({
    data: {
      agentId,
      status: "queued",
      trigger: "manual",
      input: { message: input },
    },
  });

  const definition = mapAgent(agent);
  void executeRun(run.id, definition, input);
  return run.id;
}

export async function cancelRun(runId: string): Promise<void> {
  const run = await prisma.agentRun.findUnique({ where: { id: runId } });
  if (!run) return;

  const { signalOrchestrationCancel } = await import("./orchestration-service.js");
  if (run.orchestrationId && !run.parentRunId) {
    signalOrchestrationCancel(runId);
  }

  const children = await prisma.agentRun.findMany({
    where: {
      parentRunId: runId,
      status: { in: ["queued", "running", "waiting"] },
    },
  });

  for (const child of children) {
    await runtime.cancel(child.id);
    await prisma.agentRun.update({
      where: { id: child.id },
      data: { status: "cancelled", completedAt: new Date() },
    });
    eventBus.close(child.id);
  }

  if (run.agentId) {
    await runtime.cancel(runId);
  }

  await prisma.agentRun.update({
    where: { id: runId },
    data: { status: "cancelled", completedAt: new Date() },
  });
  eventBus.close(runId);
}
