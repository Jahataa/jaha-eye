import { beforeEach, describe, expect, it, vi } from "vitest";

const writeDeliverableNote = vi.fn(async () => undefined);

vi.mock("./office-brain.js", () => ({
  writeDeliverableNote,
}));

const officeTaskRunFindFirst = vi.fn();
const officeTaskFindUnique = vi.fn();
const officeTaskUpdate = vi.fn();
const agentRunFindUnique = vi.fn();
const agentRunEventFindMany = vi.fn();

vi.mock("@jaha-eye/database", () => ({
  prisma: {
    officeTaskRun: { findFirst: officeTaskRunFindFirst },
    officeTask: {
      findUnique: officeTaskFindUnique,
      update: officeTaskUpdate,
    },
    agentRun: { findUnique: agentRunFindUnique },
    agentRunEvent: { findMany: agentRunEventFindMany },
  },
}));

vi.mock("../lib/mappers.js", () => ({
  mapEvent: (row: unknown) => row,
}));

vi.mock("./office-learning.js", () => ({
  classifyFeedback: vi.fn(),
  saveLesson: vi.fn(),
}));

describe("handleOfficeRunSettled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes a brain note from run.output when events have no assistant text", async () => {
    officeTaskRunFindFirst.mockResolvedValue({
      taskId: "task-1",
      runId: "run-1",
      mode: "normal",
    });
    officeTaskFindUnique.mockResolvedValue({
      id: "task-1",
      title: "Ship report",
      text: "ship",
      agentId: "agent-1",
      needsOk: true,
      department: "ops",
      draft: null,
    });
    agentRunFindUnique.mockResolvedValue({
      id: "run-1",
      status: "completed",
      output: { replies: [{ output: "Done from output json" }] },
      agent: { modelName: "gpt-4o-mini", tools: [], name: "A" },
    });
    agentRunEventFindMany.mockResolvedValue([]);
    officeTaskUpdate.mockResolvedValue({});

    const { handleOfficeRunSettled } = await import("./office-task-service.js");
    await handleOfficeRunSettled("run-1");

    expect(writeDeliverableNote).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "Done from output json",
        taskId: "task-1",
        runId: "run-1",
      }),
    );
    expect(officeTaskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "done", result: "Done from output json" }),
      }),
    );
  });

  it("manual needsOk still writes a note (normal mode, not draft waiting)", async () => {
    officeTaskRunFindFirst.mockResolvedValue({
      taskId: "task-needs",
      runId: "run-needs",
      mode: "normal",
    });
    officeTaskFindUnique.mockResolvedValue({
      id: "task-needs",
      title: "Send email",
      text: "send email to client",
      agentId: "agent-1",
      needsOk: true,
      department: "emails",
      draft: null,
    });
    agentRunFindUnique.mockResolvedValue({
      id: "run-needs",
      status: "completed",
      output: { message: "Draft email ready" },
      agent: { modelName: "gpt-4o-mini", tools: [], name: "A" },
    });
    agentRunEventFindMany.mockResolvedValue([
      { type: "TEXT_MESSAGE_CONTENT", payload: { delta: "Draft email ready" } },
    ]);
    officeTaskUpdate.mockResolvedValue({});

    const { handleOfficeRunSettled } = await import("./office-task-service.js");
    await handleOfficeRunSettled("run-needs");

    expect(writeDeliverableNote).toHaveBeenCalled();
    expect(officeTaskUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "waiting" }) }),
    );
  });

  it("clock draft mode waits and does not write a note", async () => {
    officeTaskRunFindFirst.mockResolvedValue({
      taskId: "task-draft",
      runId: "run-draft",
      mode: "draft",
    });
    officeTaskFindUnique.mockResolvedValue({
      id: "task-draft",
      title: "Routine",
      text: "post update",
      agentId: "agent-1",
      needsOk: true,
      department: "marketing",
      draft: null,
    });
    agentRunFindUnique.mockResolvedValue({
      id: "run-draft",
      status: "completed",
      output: null,
      agent: { modelName: "gpt-4o-mini", tools: [], name: "A" },
    });
    agentRunEventFindMany.mockResolvedValue([
      { type: "TEXT_MESSAGE_CONTENT", payload: { delta: "Draft body" } },
    ]);
    officeTaskUpdate.mockResolvedValue({});

    const { handleOfficeRunSettled } = await import("./office-task-service.js");
    await handleOfficeRunSettled("run-draft");

    expect(writeDeliverableNote).not.toHaveBeenCalled();
    expect(officeTaskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "waiting", draft: "Draft body" }),
      }),
    );
  });

  it("empty reply sets error and skips note", async () => {
    officeTaskRunFindFirst.mockResolvedValue({
      taskId: "task-empty",
      runId: "run-empty",
      mode: "normal",
    });
    officeTaskFindUnique.mockResolvedValue({
      id: "task-empty",
      title: "Empty",
      text: "work",
      agentId: "agent-1",
      needsOk: false,
      department: "ops",
      draft: null,
    });
    agentRunFindUnique.mockResolvedValue({
      id: "run-empty",
      status: "completed",
      output: null,
      agent: { modelName: "gpt-4o-mini", tools: [], name: "A" },
    });
    agentRunEventFindMany.mockResolvedValue([]);
    officeTaskUpdate.mockResolvedValue({});

    const { handleOfficeRunSettled } = await import("./office-task-service.js");
    await handleOfficeRunSettled("run-empty");

    expect(writeDeliverableNote).not.toHaveBeenCalled();
    expect(officeTaskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "error",
          result: "Run completed with no captured text",
        }),
      }),
    );
  });

  it("handles team-linked parent runs", async () => {
    officeTaskRunFindFirst.mockResolvedValue({
      taskId: "task-2",
      runId: "parent-1",
      mode: "team",
    });
    officeTaskFindUnique.mockResolvedValue({
      id: "task-2",
      title: "Team task",
      text: "collab",
      agentId: "lead-1",
      needsOk: false,
      department: "sales",
      draft: null,
    });
    agentRunFindUnique.mockResolvedValue({
      id: "parent-1",
      status: "completed",
      output: { replies: [{ output: "Synthesized" }] },
      agent: null,
    });
    agentRunEventFindMany.mockResolvedValue([]);
    officeTaskUpdate.mockResolvedValue({});

    const { handleOfficeRunSettled } = await import("./office-task-service.js");
    await handleOfficeRunSettled("parent-1");

    expect(writeDeliverableNote).toHaveBeenCalledWith(
      expect.objectContaining({ body: "Synthesized", agentId: "lead-1" }),
    );
  });

  it("stores run error message on failed runs", async () => {
    officeTaskRunFindFirst.mockResolvedValue({
      taskId: "task-fail",
      runId: "run-fail",
      mode: "normal",
    });
    officeTaskFindUnique.mockResolvedValue({
      id: "task-fail",
      title: "Fail",
      text: "x",
      agentId: "agent-1",
      needsOk: false,
      department: "ops",
      draft: null,
    });
    agentRunFindUnique.mockResolvedValue({
      id: "run-fail",
      status: "failed",
      error: { message: "Timeout" },
      agent: null,
    });
    agentRunEventFindMany.mockResolvedValue([]);
    officeTaskUpdate.mockResolvedValue({});

    const { handleOfficeRunSettled } = await import("./office-task-service.js");
    await handleOfficeRunSettled("run-fail");

    expect(officeTaskUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "error", result: "Timeout" }),
      }),
    );
  });
});
