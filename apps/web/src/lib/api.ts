import type {
  AgentDefinition,
  AgentRun,
  AgentRunDetail,
  BuiltinTool,
  CreateAgentInput,
  CreateOrchestrationInput,
  OrchestrationDefinition,
  PersistedAgentEvent,
  RolePreset,
  UpdateAgentInput,
  UpdateOrchestrationInput,
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
  getRun: (id: string) => request<AgentRunDetail>(`/api/runs/${id}`),
  getOrchestrations: () => request<OrchestrationDefinition[]>("/api/orchestrations"),
  getOrchestration: (id: string) =>
    request<OrchestrationDefinition>(`/api/orchestrations/${id}`),
  createOrchestration: (data: CreateOrchestrationInput) =>
    request<OrchestrationDefinition>("/api/orchestrations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateOrchestration: (id: string, data: UpdateOrchestrationInput) =>
    request<OrchestrationDefinition>(`/api/orchestrations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteOrchestration: (id: string) =>
    request<void>(`/api/orchestrations/${id}`, { method: "DELETE" }),
  enableOrchestration: (id: string) =>
    request<OrchestrationDefinition>(`/api/orchestrations/${id}/enable`, { method: "POST" }),
  disableOrchestration: (id: string) =>
    request<OrchestrationDefinition>(`/api/orchestrations/${id}/disable`, { method: "POST" }),
  startOrchestrationRun: (id: string, input: string) =>
    request<{ runId: string }>(`/api/orchestrations/${id}/run`, {
      method: "POST",
      body: JSON.stringify({ input }),
    }),
  getRunEvents: (id: string) => request<PersistedAgentEvent[]>(`/api/runs/${id}/events`),
  cancelRun: (id: string) => request<AgentRun>(`/api/runs/${id}/cancel`, { method: "POST" }),
  getTools: () => request<BuiltinTool[]>("/api/tools"),
  getRolePresets: () => request<RolePreset[]>("/api/role-presets"),
};
