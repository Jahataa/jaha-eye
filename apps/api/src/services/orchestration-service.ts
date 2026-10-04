import { prisma, type Prisma } from "@jaha-eye/database";
import {
  assertDag,
  composeNodeInput,
  extractAssistantReply,
  getUpstreamNodeIds,
  sinkNodeIds,
  topologicalWaves,
  type OrchestrationGraph,
} from "@jaha-eye/shared";
import { mapAgent, mapEvent } from "../lib/mappers.js";
import { eventBus } from "./event-bus.js";
import { executeRun, persistRunEvent } from "./run-service.js";

interface OrchestrationContext {
  cancelled: boolean;
}

class OrchestrationCancelledError extends Error {
  constructor() {
    super("Orchestration cancelled");
    this.name = "OrchestrationCancelledError";
  }
}

const activeOrchestrations = new Map<string, OrchestrationContext>();

export function signalOrchestrationCancel(runId: string): void {
  const ctx = activeOrchestrations.get(runId);
  if (ctx) {
    ctx.cancelled = true;
  }
}

function isCancelled(parentRunId: string): boolean {
  return activeOrchestrations.get(parentRunId)?.cancelled ?? false;
}

async function persistParentEvent(
  parentRunId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await persistRunEvent(parentRunId, {
    type,
    timestamp: new Date(),
    payload: { type, ...payload },
  });
}

async function getChildReply(childRunId: string): Promise<string | null> {
  const events = await prisma.agentRunEvent.findMany({
    where: { runId: childRunId },
    orderBy: { sequence: "asc" },
  });
  return extractAssistantReply(events.map(mapEvent));
}

async function executeNode(
  parentRunId: string,
  orchestrationId: string,
  graph: OrchestrationGraph,
  nodeId: string,
  originalMessage: string,
  nodeOutputs: Map<string, string>,
): Promise<{ nodeId: string; output: string }> {
  if (isCancelled(parentRunId)) {
    throw new OrchestrationCancelledError();
  }

  const node = graph.nodes.find((entry) => entry.id === nodeId);
  if (!node) {
    throw new Error(`Graph node not found: ${nodeId}`);
  }

  const agent = await prisma.agent.findUniqueOrThrow({ where: { id: node.agentId } });
  if (agent.status === "disabled") {
    throw new Error(`Agent is disabled: ${agent.slug}`);
  }

  await persistParentEvent(parentRunId, "NODE_STARTED", {
    nodeId,
    agentId: node.agentId,
  });

  const upstreamIds = getUpstreamNodeIds(graph, nodeId);
  const dependencyOutputs = upstreamIds.map((upstreamId) => {
    const upstreamNode = graph.nodes.find((entry) => entry.id === upstreamId);
    if (!upstreamNode) {
      throw new Error(`Upstream node not found: ${upstreamId}`);
    }
    return {
      nodeId: upstreamId,
      agentId: upstreamNode.agentId,
      output: nodeOutputs.get(upstreamId) ?? "",
    };
  });

  const message =
    upstreamIds.length === 0
      ? originalMessage
      : composeNodeInput(originalMessage, dependencyOutputs);

  const childRun = await prisma.agentRun.create({
    data: {
      agentId: node.agentId,
      orchestrationId,
      graphNodeId: nodeId,
      parentRunId,
      status: "queued",
      trigger: "manual",
      input: { message },
    },
  });

  await executeRun(childRun.id, mapAgent(agent), message);

  const completedChild = await prisma.agentRun.findUniqueOrThrow({
    where: { id: childRun.id },
  });

  if (completedChild.status === "cancelled") {
    throw new OrchestrationCancelledError();
  }

  if (completedChild.status === "failed") {
    const errorMessage =
      (completedChild.error as { message?: string } | null)?.message ?? "Node failed";
    await persistParentEvent(parentRunId, "NODE_ERROR", {
      nodeId,
      agentId: node.agentId,
      message: errorMessage,
    });
    throw new Error(errorMessage);
  }

  const reply = (await getChildReply(childRun.id)) ?? "";
  await persistParentEvent(parentRunId, "NODE_FINISHED", {
    nodeId,
    agentId: node.agentId,
    output: reply,
  });

  return { nodeId, output: reply };
}

async function cancelQueuedChildren(parentRunId: string): Promise<void> {
  await prisma.agentRun.updateMany({
    where: {
      parentRunId,
      status: "queued",
    },
    data: {
      status: "cancelled",
      completedAt: new Date(),
    },
  });
}

export async function executeOrchestrationRun(
  parentRunId: string,
  orchestrationId: string,
  message: string,
  graph: OrchestrationGraph,
): Promise<void> {
  activeOrchestrations.set(parentRunId, { cancelled: false });

  try {
    await prisma.agentRun.update({
      where: { id: parentRunId },
      data: { status: "running", startedAt: new Date() },
    });

    await persistParentEvent(parentRunId, "RUN_STARTED", { message });

    const waves = topologicalWaves(graph);
    const nodeOutputs = new Map<string, string>();

    for (const wave of waves) {
      if (isCancelled(parentRunId)) {
        await cancelQueuedChildren(parentRunId);
        await prisma.agentRun.update({
          where: { id: parentRunId },
          data: { status: "cancelled", completedAt: new Date() },
        });
        return;
      }

      try {
        const results = await Promise.all(
          wave.map((nodeId) =>
            executeNode(parentRunId, orchestrationId, graph, nodeId, message, nodeOutputs),
          ),
        );
        for (const result of results) {
          nodeOutputs.set(result.nodeId, result.output);
        }
      } catch (error) {
        await cancelQueuedChildren(parentRunId);
        if (error instanceof OrchestrationCancelledError || isCancelled(parentRunId)) {
          const current = await prisma.agentRun.findUnique({ where: { id: parentRunId } });
          if (current?.status !== "cancelled") {
            await prisma.agentRun.update({
              where: { id: parentRunId },
              data: { status: "cancelled", completedAt: new Date() },
            });
          }
          return;
        }

        const errorMessage = error instanceof Error ? error.message : "Orchestration failed";
        await persistParentEvent(parentRunId, "RUN_ERROR", { message: errorMessage });
        await prisma.agentRun.update({
          where: { id: parentRunId },
          data: {
            status: "failed",
            completedAt: new Date(),
            error: { message: errorMessage },
          },
        });
        return;
      }
    }

    const sinks = sinkNodeIds(graph);
    const replies = sinks.map((nodeId) => {
      const node = graph.nodes.find((entry) => entry.id === nodeId);
      return {
        nodeId,
        agentId: node?.agentId ?? null,
        output: nodeOutputs.get(nodeId) ?? "",
      };
    });

    const output = { replies };
    await persistParentEvent(parentRunId, "RUN_FINISHED", output);
    await prisma.agentRun.update({
      where: { id: parentRunId },
      data: {
        status: "completed",
        completedAt: new Date(),
        output: output as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Orchestration failed";
    await persistParentEvent(parentRunId, "RUN_ERROR", { message: errorMessage });
    await prisma.agentRun.update({
      where: { id: parentRunId },
      data: {
        status: "failed",
        completedAt: new Date(),
        error: { message: errorMessage },
      },
    });
  } finally {
    activeOrchestrations.delete(parentRunId);
    eventBus.close(parentRunId);
  }
}

export async function validateOrchestrationAgents(graph: OrchestrationGraph): Promise<void> {
  assertDag(graph);

  const agentIds = [...new Set(graph.nodes.map((node) => node.agentId))];
  const agents = await prisma.agent.findMany({
    where: { id: { in: agentIds } },
  });

  const agentsById = new Map(agents.map((agent) => [agent.id, agent]));
  for (const agentId of agentIds) {
    const agent = agentsById.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    if (agent.status === "disabled") {
      throw new Error(`Agent is disabled: ${agent.slug}`);
    }
  }
}

export async function startOrchestrationRun(
  orchestrationId: string,
  input: string,
): Promise<string> {
  const orchestration = await prisma.orchestration.findUniqueOrThrow({
    where: { id: orchestrationId },
  });

  if (orchestration.status === "disabled") {
    throw new Error("Orchestration is disabled");
  }

  const graph = orchestration.graph as OrchestrationGraph;
  await validateOrchestrationAgents(graph);

  const parentRun = await prisma.agentRun.create({
    data: {
      orchestrationId,
      status: "queued",
      trigger: "manual",
      input: {
        message: input,
        graph,
      },
    },
  });

  void executeOrchestrationRun(parentRun.id, orchestrationId, input, graph);
  return parentRun.id;
}

export async function isAgentReferencedInOrchestrations(agentId: string): Promise<boolean> {
  const orchestrations = await prisma.orchestration.findMany({
    select: { graph: true },
  });

  return orchestrations.some((orchestration) => {
    const graph = orchestration.graph as OrchestrationGraph;
    return graph.nodes.some((node) => node.agentId === agentId);
  });
}
