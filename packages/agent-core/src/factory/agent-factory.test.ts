import { describe, expect, it, vi } from "vitest";
import type { AgentDefinition } from "@jaha-eye/shared";

vi.mock("@strands-agents/sdk", () => ({
  Agent: vi.fn(function Agent(this: { config: unknown }, config: unknown) {
    this.config = config;
    return { config };
  }),
}));

vi.mock("@ag-ui/aws-strands", () => ({
  StrandsAgent: vi.fn(function StrandsAgent(opts: unknown) {
    return opts;
  }),
}));

vi.mock("@strands-agents/sdk/models/openai", () => ({
  OpenAIModel: vi.fn(function OpenAIModel(config: unknown) {
    return { config, getConfig: () => config };
  }),
}));

vi.mock("../tools/registry.js", () => ({
  resolveTools: () => [],
}));

import { Agent } from "@strands-agents/sdk";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";
import { AgentFactory } from "./agent-factory.js";

const baseDefinition: AgentDefinition = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Test",
  slug: "test",
  description: null,
  department: null,
  brief: null,
  isDepartmentLead: false,
  status: "active",
  modelProvider: "openai",
  modelName: "gpt-4o-mini",
  modelBaseUrl: null,
  modelTemperature: 0.7,
  modelContextWindowLimit: null,
  modelMaxTokens: null,
  systemPrompt: "Hi",
  tools: [],
  defaultRunInput: null,
  maxConcurrentRuns: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("AgentFactory", () => {
  it("passes context limits to OpenAIModel and enables auto context manager", async () => {
    const factory = new AgentFactory({
      resolveLlmDefaults: async () => ({ openaiApiKey: "sk-test" }),
    });

    await factory.createStrandsAgent(
      { ...baseDefinition, modelContextWindowLimit: 32768, modelMaxTokens: 4096 },
      new Map(),
    );

    expect(OpenAIModel).toHaveBeenCalledWith(
      expect.objectContaining({
        contextWindowLimit: 32768,
        maxTokens: 4096,
      }),
    );
    expect(Agent).toHaveBeenCalledWith(
      expect.objectContaining({
        contextManager: "auto",
      }),
    );
  });
});
