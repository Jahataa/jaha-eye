import { describe, expect, it, vi } from "vitest";
import type { AgentDefinition } from "@jaha-eye/shared";

const { skillFindMany } = vi.hoisted(() => ({
  skillFindMany: vi.fn(async () => [] as Array<{
    name: string;
    body: string;
    agentIds: unknown;
    departments: unknown;
  }>),
}));

vi.mock("@jaha-eye/database", () => ({
  prisma: {
    skill: { findMany: skillFindMany },
    lesson: { findMany: vi.fn(async () => []) },
    brainNote: { findMany: vi.fn(async () => []) },
    officeTask: { findUnique: vi.fn(async () => null) },
  },
}));

vi.mock("./office-note-context.js", () => ({
  pickContextNoteTitles: vi.fn(async () => []),
  normalizeWikiLinkTarget: (value: string) => value,
}));

import { composeOfficePrompt } from "./office-prompt-composer.js";

const now = new Date("2026-01-01T00:00:00.000Z");
const baseDefinition: AgentDefinition = {
  id: "00000000-0000-4000-8000-000000000099",
  name: "Test",
  slug: "test",
  description: null,
  status: "active",
  modelProvider: "openai",
  modelName: "gpt-4o-mini",
  modelBaseUrl: null,
  modelTemperature: 0.2,
  modelContextWindowLimit: null,
  modelMaxTokens: null,
  systemPrompt: "You are helpful.",
  tools: ["current_time"],
  defaultRunInput: null,
  department: null,
  brief: null,
  isDepartmentLead: false,
  maxConcurrentRuns: 1,
  createdAt: now,
  updatedAt: now,
};

describe("composeOfficePrompt", () => {
  it("returns the same object when nothing applies", async () => {
    const result = await composeOfficePrompt(baseDefinition, { mode: "normal" });
    expect(result).toBe(baseDefinition);
  });

  it("includes unbound skills for every agent", async () => {
    skillFindMany.mockResolvedValueOnce([
      {
        name: "Global checklist",
        body: "Always verify dates.",
        agentIds: [],
        departments: [],
      },
    ]);

    const result = await composeOfficePrompt(baseDefinition, { mode: "normal" });
    expect(result.systemPrompt).toContain("Global checklist");
    expect(result.systemPrompt).toContain("Always verify dates.");
  });
});
