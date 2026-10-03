import type { Agent, AgentRun, AgentRunEvent } from "@jaha-eye/database";
import type { AgentDefinition, AgentRun as SharedRun, PersistedAgentEvent } from "@jaha-eye/shared";

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
    maxConcurrentRuns: agent.maxConcurrentRuns,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  };
}

export function mapRun(run: AgentRun): SharedRun {
  return {
    id: run.id,
    agentId: run.agentId,
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
