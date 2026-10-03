import type {
  AgentDefinition,
  AgentRun,
  BuiltinTool,
  CreateAgentInput,
  PersistedAgentEvent,
  UpdateAgentInput,
} from "@jaha-eye/shared";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  getAgents: () => request<AgentDefinition[]>("/api/agents"),
  getAgent: (id: string) => request<AgentDefinition>(`/api/agents/${id}`),
  createAgent: (data: CreateAgentInput) =>
    request<AgentDefinition>("/api/agents", { method: "POST", body: JSON.stringify(data) }),
  updateAgent: (id: string, data: UpdateAgentInput) =>
    request<AgentDefinition>(`/api/agents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteAgent: (id: string) => request<void>(`/api/agents/${id}`, { method: "DELETE" }),
  enableAgent: (id: string) =>
    request<AgentDefinition>(`/api/agents/${id}/enable`, { method: "POST" }),
  disableAgent: (id: string) =>
    request<AgentDefinition>(`/api/agents/${id}/disable`, { method: "POST" }),
  startRun: (agentId: string, input: string) =>
    request<{ runId: string }>(`/api/agents/${agentId}/run`, {
      method: "POST",
      body: JSON.stringify({ input }),
    }),
  getRuns: () => request<AgentRun[]>("/api/runs"),
  getRun: (id: string) => request<AgentRun>(`/api/runs/${id}`),
  getRunEvents: (id: string) => request<PersistedAgentEvent[]>(`/api/runs/${id}/events`),
  cancelRun: (id: string) => request<AgentRun>(`/api/runs/${id}/cancel`, { method: "POST" }),
  getTools: () => request<BuiltinTool[]>("/api/tools"),
};
