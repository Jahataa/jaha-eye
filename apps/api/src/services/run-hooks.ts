import type { AgentDefinition } from "@jaha-eye/shared";

export type RunExecutionMode = "normal" | "draft" | "approve" | "revise" | "team";

export type RunExecutionContext = {
  taskId?: string;
  mode?: RunExecutionMode;
};

type PromptComposer = (
  definition: AgentDefinition,
  ctx: RunExecutionContext,
) => Promise<AgentDefinition> | AgentDefinition;

type RunSettledListener = (runId: string) => Promise<void>;

const promptComposers: PromptComposer[] = [];
const runSettledListeners: RunSettledListener[] = [];

const runContextByRunId = new Map<string, RunExecutionContext>();

export function registerPromptComposer(composer: PromptComposer): void {
  promptComposers.push(composer);
}

export function registerRunSettledListener(listener: RunSettledListener): void {
  runSettledListeners.push(listener);
}

export function clearRunHooksForTests(): void {
  promptComposers.length = 0;
  runSettledListeners.length = 0;
  runContextByRunId.clear();
}

export function setRunContext(runId: string, ctx: RunExecutionContext): void {
  runContextByRunId.set(runId, ctx);
}

export function takeRunContext(runId: string): RunExecutionContext {
  const ctx = runContextByRunId.get(runId) ?? {};
  runContextByRunId.delete(runId);
  return ctx;
}

export async function applyPromptComposers(
  definition: AgentDefinition,
  ctx: RunExecutionContext,
): Promise<AgentDefinition> {
  let next = definition;
  for (const composer of promptComposers) {
    next = await composer(next, ctx);
  }
  return next;
}

export async function emitRunSettled(runId: string): Promise<void> {
  for (const listener of runSettledListeners) {
    try {
      await listener(runId);
    } catch (error) {
      console.error("[run-hooks] settled listener failed", error);
    }
  }
}
