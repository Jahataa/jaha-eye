import type { AgentDefinition } from "@jaha-eye/shared";
import type { NormalizedEvent } from "../events/normalizer.js";

export interface AgentRunInput {
  runId: string;
  message: string;
}

export type AgentRunStatus =
  | "queued"
  | "running"
  | "waiting"
  | "completed"
  | "failed"
  | "cancelled";

export interface AgentRuntime {
  stream(
    definition: AgentDefinition,
    input: AgentRunInput,
  ): AsyncIterable<NormalizedEvent>;
  cancel(runId: string): Promise<void>;
  getStatus(runId: string): AgentRunStatus | undefined;
}
