import type { Agent, AgentRun, AgentRunEvent, Orchestration, Schedule } from "@jaha-eye/database";
import type {
  AgentDefinition,
  AgentRun as SharedRun,
  OrchestrationDefinition,
  OrchestrationGraph,
  PersistedAgentEvent,
  RunChildSummary,
  Schedule as SharedSchedule,
} from "@jaha-eye/shared";

export function mapAgent(agent: Agent): AgentDefinition {
  return {
    id: agent.id,
    name: agent.name,
    slug: agent.slug,
    description: agent.description,
    status: agent.status,
    modelProvider: agent.modelProvider,
    modelName: agent.modelName,
    modelBaseUrl: agent.modelBaseUrl,
    modelTemperature: agent.modelTemperature,
    systemPrompt: agent.systemPrompt,
    tools: Array.isArray(agent.tools) ? (agent.tools as string[]) : [],
    defaultRunInput: agent.defaultRunInput,
    maxConcurrentRuns: agent.maxConcurrentRuns,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

export function mapRun(run: AgentRun): SharedRun {
  return {
    id: run.id,
    agentId: run.agentId,
    orchestrationId: run.orchestrationId,
    graphNodeId: run.graphNodeId,
    parentRunId: run.parentRunId,
    status: run.status,
    trigger: run.trigger,
    input: run.input,
    output: run.output,
    error: run.error as SharedRun["error"],
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}

export function mapRunChild(
  run: Pick<AgentRun, "id" | "agentId" | "graphNodeId" | "status" | "input">,
  outputReply?: string | null,
  outputVariables?: Record<string, string>,
): RunChildSummary {
  const inputRecord =
    typeof run.input === "object" && run.input !== null
      ? (run.input as { message?: string })
      : null;

  return {
    id: run.id,
    agentId: run.agentId,
    graphNodeId: run.graphNodeId,
    status: run.status,
    inputMessage: inputRecord?.message,
    outputReply: outputReply ?? undefined,
    outputVariables,
  };
}

export function mapOrchestration(orchestration: Orchestration): OrchestrationDefinition {
  return {
    id: orchestration.id,
    name: orchestration.name,
    slug: orchestration.slug,
    description: orchestration.description,
    status: orchestration.status,
    graph: orchestration.graph as OrchestrationGraph,
    defaultRunInput: orchestration.defaultRunInput,
    createdAt: orchestration.createdAt,
    updatedAt: orchestration.updatedAt,
  };
}

export function mapSchedule(schedule: Schedule): SharedSchedule {
  return {
    id: schedule.id,
    name: schedule.name,
    enabled: schedule.enabled,
    targetType: schedule.targetType,
    agentId: schedule.agentId,
    orchestrationId: schedule.orchestrationId,
    expression: schedule.expression,
    input: schedule.input,
    lastFiredAt: schedule.lastFiredAt,
    lastFiredSlot: schedule.lastFiredSlot,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
  };
}

export function mapEvent(event: AgentRunEvent): PersistedAgentEvent {
  return {
    id: event.id,
    runId: event.runId,
    sequence: event.sequence,
    type: event.type,
    timestamp: event.timestamp,
    payload: event.payload as Record<string, unknown>,
  };
}
