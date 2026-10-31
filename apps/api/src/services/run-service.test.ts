import { beforeEach, describe, expect, it, vi } from "vitest";

const { countMock, findUniqueMock, createMock } = vi.hoisted(() => ({
  countMock: vi.fn(),
  findUniqueMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("@jaha-eye/database", () => ({
  prisma: {
    agentRun: {
      count: countMock,
      create: createMock,
      update: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    agentRunEvent: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    agent: {
      findUniqueOrThrow: findUniqueMock,
    },
  },
}));

vi.mock("@jaha-eye/agent-core", () => ({
  AgentFactory: vi.fn(),
  StrandsRuntime: vi.fn(() => ({
    stream: vi.fn(async function* () {}),
    cancel: vi.fn(),
  })),
}));

vi.mock("./event-bus.js", () => ({
  eventBus: { publish: vi.fn(), close: vi.fn() },
}));

vi.mock("./settings-service.js", () => ({
  getEffectiveLlmConfig: vi.fn(async () => ({})),
}));

describe("concurrent run limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUniqueMock.mockResolvedValue({
      id: "agent-1",
      status: "active",
      maxConcurrentRuns: 1,
      name: "A",
      slug: "a",
      description: null,
      modelProvider: "openai",
      modelName: "gpt-4o-mini",
      modelBaseUrl: null,
      modelTemperature: 0.7,
      systemPrompt: "hi",
      tools: [],
      defaultRunInput: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("startRun rejects a second run when maxConcurrentRuns is 1", async () => {
    countMock.mockResolvedValue(1);

    const { startRun, ConcurrentRunLimitError } = await import("./run-service.js");

    await expect(startRun("agent-1", "hello")).rejects.toBeInstanceOf(ConcurrentRunLimitError);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("assertAgentConcurrentRunCapacity throws at the limit", async () => {
    countMock.mockResolvedValue(1);

    const { assertAgentConcurrentRunCapacity, ConcurrentRunLimitError } = await import(
      "./run-service.js"
    );

    await expect(assertAgentConcurrentRunCapacity("agent-1", 1)).rejects.toBeInstanceOf(
      ConcurrentRunLimitError,
    );
  });
});
