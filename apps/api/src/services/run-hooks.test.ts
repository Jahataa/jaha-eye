import { describe, expect, it } from "vitest";
import type { AgentDefinition } from "@jaha-eye/shared";
import {
  applyPromptComposers,
  clearRunHooksForTests,
  registerPromptComposer,
} from "./run-hooks.js";

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

describe("run-hooks", () => {
  it("returns definition unchanged when no composers registered", async () => {
    clearRunHooksForTests();
    const result = await applyPromptComposers(baseDefinition, {});
    expect(result).toEqual(baseDefinition);
  });

  it("applies registered composers in order", async () => {
    clearRunHooksForTests();
    registerPromptComposer((def) => ({ ...def, systemPrompt: `${def.systemPrompt} A` }));
    registerPromptComposer((def) => ({ ...def, systemPrompt: `${def.systemPrompt} B` }));
    const result = await applyPromptComposers(baseDefinition, { mode: "draft" });
    expect(result.systemPrompt).toBe("Hi A B");
  });
});
