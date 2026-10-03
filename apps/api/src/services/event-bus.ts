import type { PersistedAgentEvent } from "@jaha-eye/shared";

type Listener = (event: PersistedAgentEvent) => void;

export class EventBus {
  private readonly listeners = new Map<string, Set<Listener>>();

  subscribe(runId: string, listener: Listener): () => void {
    if (!this.listeners.has(runId)) {
      this.listeners.set(runId, new Set());
    }
    this.listeners.get(runId)!.add(listener);
    return () => {
      this.listeners.get(runId)?.delete(listener);
    };
  }

  publish(runId: string, event: PersistedAgentEvent): void {
    for (const listener of this.listeners.get(runId) ?? []) {
      listener(event);
    }
  }

  close(runId: string): void {
    this.listeners.delete(runId);
  }
}

export const eventBus = new EventBus();
