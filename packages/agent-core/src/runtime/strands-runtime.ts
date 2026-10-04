import type { RunAgentInput } from "@ag-ui/core";
import type { Agent } from "@strands-agents/sdk";
import type { AgentDefinition } from "@jaha-eye/shared";
import { AgentFactory } from "../factory/agent-factory.js";
import { normalizeAgUiEvent, type NormalizedEvent } from "../events/normalizer.js";
import type { AgentRunInput, AgentRunStatus, AgentRuntime } from "./types.js";

interface ActiveRun {
  status: AgentRunStatus;
  strandsAgent: Awaited<ReturnType<AgentFactory["createStrandsAgent"]>>["strandsAgent"];
}

export class StrandsRuntime implements AgentRuntime {
  private readonly agentsByThread = new Map<string, Agent>();
  private readonly activeRuns = new Map<string, ActiveRun>();

  constructor(private readonly factory: AgentFactory) {}

  async *stream(
    definition: AgentDefinition,
    input: AgentRunInput,
  ): AsyncIterable<NormalizedEvent> {
    const { runId, message } = input;
    const { strandsAgent } = await this.factory.createStrandsAgent(
      definition,
      this.agentsByThread,
    );

    this.activeRuns.set(runId, { status: "running", strandsAgent });

    const runInput: RunAgentInput = {
      threadId: runId,
      runId,
      messages: [
        {
          id: `${runId}-user`,
          role: "user",
          content: message,
        },
      ],
      tools: [],
      context: [],
      forwardedProps: {},
      state: {},
    };

    try {
      for await (const event of strandsAgent.run(runInput)) {
        yield normalizeAgUiEvent(event);
      }
      this.setStatus(runId, "completed");
    } catch (error) {
      this.setStatus(runId, "failed");
      throw error;
    } finally {
      this.agentsByThread.delete(runId);
      const run = this.activeRuns.get(runId);
      if (run && run.status === "running") {
        this.setStatus(runId, "completed");
      }
    }
  }

  async cancel(runId: string): Promise<void> {
    const agent = this.agentsByThread.get(runId);
    if (agent) {
      agent.cancel();
    }
    this.setStatus(runId, "cancelled");
    this.agentsByThread.delete(runId);
  }

  getStatus(runId: string): AgentRunStatus | undefined {
    return this.activeRuns.get(runId)?.status;
  }

  private setStatus(runId: string, status: AgentRunStatus): void {
    const run = this.activeRuns.get(runId);
    if (run) {
      run.status = status;
    } else {
      this.activeRuns.set(runId, {
        status,
        strandsAgent: null as unknown as ActiveRun["strandsAgent"],
      });
    }
  }
}
