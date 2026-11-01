import { describe, expect, it } from "vitest";
import type { Agent } from "@jaha-eye/database";
import { mapAgent } from "./mappers.js";

describe("mapAgent", () => {
  it("maps department field", () => {
    const agent = {
      id: "00000000-0000-4000-8000-000000000001",
      name: "A",
      slug: "a",
      description: null,
      department: "Research",
      brief: null,
      isDepartmentLead: false,
      status: "active" as const,
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
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
    } satisfies Agent;

    expect(mapAgent(agent).department).toBe("Research");
  });
});
