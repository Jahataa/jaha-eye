import { prisma } from "@jaha-eye/database";
import {
  extractAssistantReply,
  type CreateOfficeTaskInput,
  type OfficeTaskRunMode,
  type OrchestrationGraph,
} from "@jaha-eye/shared";
import { mapEvent } from "../lib/mappers.js";
import { startRun } from "../services/run-service.js";
import { mapOfficeTask } from "./office-mappers.js";
import { routeOfficeTask } from "./office-router.js";
import { runTeamTask } from "./office-team.js";
import { classifyFeedback, saveLesson } from "./office-learning.js";
import { replyFromRunOutput } from "./office-run-reply.js";

const LATE_MS = 90_000;
const SCHEDULE_PAST_GRACE_MS = 60_000;

const pendingOperatorFeedback = new Map<string, string>();

export class OfficeTaskScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfficeTaskScheduleError";
  }
}

function runErrorMessage(run: { error: unknown; status: string }): string {
  if (run.status === "cancelled") return "Run was cancelled";
  const err = run.error as { message?: string } | null;
  return err?.message?.trim() || "Run failed";
}

async function latestRunIdForTask(taskId: string): Promise<string | null> {
  const link = await prisma.officeTaskRun.findFirst({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });
  return link?.runId ?? null;
}

async function teamPieceAgentIdsForTask(
  row: { status: string; teamParentRunId: string | null },
): Promise<string[] | undefined> {
  if (row.status !== "running" || !row.teamParentRunId) return undefined;

  const parent = await prisma.agentRun.findUnique({
    where: { id: row.teamParentRunId },
    select: { orchestrationId: true },
  });
  if (!parent?.orchestrationId) return undefined;

  const orchestration = await prisma.orchestration.findUnique({
    where: { id: parent.orchestrationId },
    select: { graph: true },
  });
  if (!orchestration) return undefined;

  const graph = orchestration.graph as OrchestrationGraph;
  const leadIds = new Set(
    graph.nodes.filter((node) => node.id === "lead-synth").map((node) => node.agentId),
  );
  const ids = graph.nodes
    .filter((node) => !leadIds.has(node.agentId) && node.id.startsWith("piece-"))
    .map((node) => node.agentId);
  return [...new Set(ids)];
}

async function mapTaskRow(row: NonNullable<Awaited<ReturnType<typeof prisma.officeTask.findUnique>>>) {
  const latestRunId = await latestRunIdForTask(row.id);
  const teamPieceAgentIds = await teamPieceAgentIdsForTask(row);
  return mapOfficeTask(row, latestRunId, teamPieceAgentIds);
}

async function linkTaskRun(taskId: string, runId: string, mode: OfficeTaskRunMode) {
  await prisma.officeTaskRun.create({
    data: { taskId, runId, mode },
  });
}

export async function listOfficeTasks() {
  const rows = await prisma.officeTask.findMany({ orderBy: { updatedAt: "desc" }, take: 200 });
  return Promise.all(
    rows.map(async (row) => {
      const latestRunId = await latestRunIdForTask(row.id);
      const teamPieceAgentIds = await teamPieceAgentIdsForTask(row);
      return mapOfficeTask(row, latestRunId, teamPieceAgentIds);
    }),
  );
}

export async function getOfficeTask(id: string) {
  const row = await prisma.officeTask.findUnique({ where: { id } });
  if (!row) return null;
  return mapTaskRow(row);
}

function assertScheduleAllowed(at: Date): void {
  if (at.getTime() < Date.now() - SCHEDULE_PAST_GRACE_MS) {
    throw new OfficeTaskScheduleError("Scheduled time is more than 60 seconds in the past");
  }
}

async function startTaskRun(input: {
  taskId: string;
  agentId: string;
  message: string;
  mode: OfficeTaskRunMode;
}) {
  const runId = await startRun(input.agentId, input.message, "manual", {
    context: { taskId: input.taskId, mode: input.mode },
    beforeExecute: async (id) => {
      await linkTaskRun(input.taskId, id, input.mode);
    },
  });
  await prisma.officeTask.update({
    where: { id: input.taskId },
    data: { status: "running", agentId: input.agentId },
  });
  return runId;
}

function resolvePinnedAgentId(
  rosterAgentId: string,
  pin: string | undefined,
  department: string,
  agentsInDept: Array<{ id: string; department: string | null }>,
): string {
  if (!pin) return rosterAgentId;
  const pinned = agentsInDept.find((agent) => agent.id === pin);
  if (pinned) return pin;
  return rosterAgentId;
}

export async function createOfficeTask(body: CreateOfficeTaskInput) {
  if (body.at) {
    assertScheduleAllowed(body.at);
    const routed = await routeOfficeTask({ department: body.department, text: body.text });
    const agentsInDept = await prisma.agent.findMany({
      where: { status: "active", department: body.department.trim() },
    });
    const agentId = resolvePinnedAgentId(
      routed.agentId,
      body.agentId,
      body.department,
      agentsInDept,
    );
    const task = await prisma.officeTask.create({
      data: {
        department: body.department.trim(),
        agentId,
        title: routed.output.title,
        text: body.text,
        status: "scheduled",
        scheduledAt: body.at,
        needsOk: routed.output.needs_ok,
        plan: routed.output.plan,
      },
    });
    return mapOfficeTask(task, null);
  }

  if (body.team) {
    const routed = await routeOfficeTask({ department: body.department, text: body.text });
    const agentsInDept = await prisma.agent.findMany({
      where: { status: "active", department: body.department.trim() },
    });
    const agentId = resolvePinnedAgentId(
      routed.agentId,
      body.agentId,
      body.department,
      agentsInDept,
    );
    const task = await prisma.officeTask.create({
      data: {
        department: body.department.trim(),
        agentId,
        title: routed.output.title,
        text: body.text,
        status: "running",
        needsOk: routed.output.needs_ok,
        plan: routed.output.plan,
      },
    });

    const team = await runTeamTask({
      department: body.department,
      text: body.text,
      needsOk: routed.output.needs_ok,
      taskId: task.id,
      clockFired: false,
    });

    await prisma.officeTask.update({
      where: { id: task.id },
      data: { teamParentRunId: team.parentRunId },
    });

    return mapOfficeTask(
      await prisma.officeTask.findUniqueOrThrow({ where: { id: task.id } }),
      team.parentRunId,
      team.pieceAgentIds,
    );
  }

  const routed = await routeOfficeTask({ department: body.department, text: body.text });
  const agentsInDept = await prisma.agent.findMany({
    where: { status: "active", department: body.department.trim() },
  });
  const agentId = resolvePinnedAgentId(
    routed.agentId,
    body.agentId,
    body.department,
    agentsInDept,
  );
  const task = await prisma.officeTask.create({
    data: {
      department: body.department.trim(),
      agentId,
      title: routed.output.title,
      text: body.text,
      status: "running",
      needsOk: routed.output.needs_ok,
      plan: routed.output.plan,
    },
  });

  const runId = await startTaskRun({
    taskId: task.id,
    agentId,
    message: body.text,
    mode: "normal",
  });

  return mapOfficeTask(await prisma.officeTask.findUniqueOrThrow({ where: { id: task.id } }), runId);
}

export async function createOfficeTaskFromRoutine(routineId: string) {
  const routine = await prisma.routine.findUniqueOrThrow({ where: { id: routineId } });
  const runMode: OfficeTaskRunMode = routine.needsOk ? "draft" : "normal";

  if (routine.team) {
    const task = await prisma.officeTask.create({
      data: {
        department: routine.department,
        agentId: routine.agentId,
        title: routine.name,
        text: routine.text,
        status: "running",
        needsOk: routine.needsOk,
        routineId: routine.id,
      },
    });
    const team = await runTeamTask({
      department: routine.department,
      text: routine.text,
      needsOk: routine.needsOk,
      taskId: task.id,
      clockFired: true,
    });
    await prisma.officeTask.update({
      where: { id: task.id },
      data: { teamParentRunId: team.parentRunId },
    });
    return mapOfficeTask(
      await prisma.officeTask.findUniqueOrThrow({ where: { id: task.id } }),
      team.parentRunId,
      team.pieceAgentIds,
    );
  }

  const task = await prisma.officeTask.create({
    data: {
      department: routine.department,
      agentId: routine.agentId,
      title: routine.name,
      text: routine.text,
      status: "running",
      needsOk: routine.needsOk,
      routineId: routine.id,
    },
  });

  const runId = await startTaskRun({
    taskId: task.id,
    agentId: routine.agentId,
    message: routine.text,
    mode: runMode,
  });

  return mapOfficeTask(await prisma.officeTask.findUniqueOrThrow({ where: { id: task.id } }), runId);
}

export async function promoteDueScheduledTasks(nowMs: number = Date.now()) {
  const due = await prisma.officeTask.findMany({
    where: { status: "scheduled", scheduledAt: { lte: new Date(nowMs) } },
  });

  for (const task of due) {
    const late = task.scheduledAt ? nowMs - task.scheduledAt.getTime() > LATE_MS : false;
    await prisma.officeTask.update({
      where: { id: task.id },
      data: { late, status: "running" },
    });

    const agentId =
      task.agentId ??
      (await routeOfficeTask({ department: task.department, text: task.text })).agentId;

    const runMode: OfficeTaskRunMode = task.needsOk ? "draft" : "normal";

    await startTaskRun({
      taskId: task.id,
      agentId,
      message: task.text,
      mode: runMode,
    });
  }
}

export async function approveOfficeTask(taskId: string) {
  const task = await prisma.officeTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");
  if (task.status !== "waiting") throw new Error("Task is not waiting for approval");
  if (!task.agentId) throw new Error("Task has no agent");

  const draft = task.draft ?? task.result ?? task.text;
  const message = `Approved draft:\n${draft}\n\nExecute outbound actions now.`;

  const runId = await startTaskRun({
    taskId,
    agentId: task.agentId,
    message,
    mode: "approve",
  });

  return mapOfficeTask(await prisma.officeTask.findUniqueOrThrow({ where: { id: taskId } }), runId);
}

export async function rejectOfficeTask(taskId: string, feedback: string) {
  const task = await prisma.officeTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");
  if (task.status !== "waiting") throw new Error("Task is not waiting for approval");
  if (!task.agentId) throw new Error("Task has no agent");

  pendingOperatorFeedback.set(taskId, feedback);

  const draft = task.draft ?? task.result ?? "";
  const message = `Previous draft:\n${draft}\n\nOperator feedback:\n${feedback}`;

  const runId = await startTaskRun({
    taskId,
    agentId: task.agentId,
    message,
    mode: "revise",
  });

  return mapOfficeTask(await prisma.officeTask.findUniqueOrThrow({ where: { id: taskId } }), runId);
}

export async function reviseOfficeTask(taskId: string, feedback: string) {
  const task = await prisma.officeTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");
  if (!task.agentId) throw new Error("Task has no agent");

  pendingOperatorFeedback.set(taskId, feedback);

  const prior = task.result ?? task.draft ?? "";
  const message = `Previous result:\n${prior}\n\nOperator feedback:\n${feedback}`;

  const runId = await startTaskRun({
    taskId,
    agentId: task.agentId,
    message,
    mode: "revise",
  });

  return mapOfficeTask(await prisma.officeTask.findUniqueOrThrow({ where: { id: taskId } }), runId);
}

export async function handleOfficeRunSettled(runId: string): Promise<void> {
  const link = await prisma.officeTaskRun.findFirst({
    where: { runId },
    orderBy: { createdAt: "desc" },
  });
  if (!link) return;

  const task = await prisma.officeTask.findUnique({ where: { id: link.taskId } });
  if (!task) return;

  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    include: { agent: true },
  });
  if (!run) return;

  const events = (
    await prisma.agentRunEvent.findMany({ where: { runId }, orderBy: { sequence: "asc" } })
  ).map(mapEvent);
  const reply = extractAssistantReply(events) ?? replyFromRunOutput(run.output);

  if (run.status === "failed" || run.status === "cancelled") {
    const message = runErrorMessage(run);
    await prisma.officeTask.update({
      where: { id: task.id },
      data: {
        status: run.status === "cancelled" ? "cancelled" : "error",
        result: message,
      },
    });
    return;
  }

  if (run.status !== "completed") return;

  if (link.mode === "draft") {
    await prisma.officeTask.update({
      where: { id: task.id },
      data: { status: "waiting", draft: reply?.trim() ?? "" },
    });
    return;
  }

  const trimmed = reply?.trim() ?? "";
  if (!trimmed) {
    await prisma.officeTask.update({
      where: { id: task.id },
      data: {
        status: "error",
        result: "Run completed with no captured text",
      },
    });
    return;
  }

  const noteBody =
    link.mode === "approve"
      ? `${task.draft?.trim() ?? ""}\n\n## AFTER YOUR OK\n\n${trimmed}`
      : trimmed;

  if (task.agentId) {
    try {
      const { writeDeliverableNote } = await import("./office-brain.js");
      await writeDeliverableNote({
        title: task.title || "Deliverable",
        body: noteBody,
        agentId: task.agentId,
        taskId: task.id,
        runId,
        model: run.agent?.modelName ?? "",
        tools: Array.isArray(run.agent?.tools) ? (run.agent.tools as string[]) : [],
        department: task.department,
        taskText: task.text,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to write brain note";
      await prisma.officeTask.update({
        where: { id: task.id },
        data: { status: "error", result: message },
      });
      return;
    }
  }

  await prisma.officeTask.update({
    where: { id: task.id },
    data: { status: "done", result: trimmed },
  });

  if (link.mode === "revise" && task.agentId) {
    const feedback = pendingOperatorFeedback.get(task.id) ?? "";
    pendingOperatorFeedback.delete(task.id);
    if (feedback.trim()) {
      const classified = await classifyFeedback({
        feedback,
        agentName: run.agent?.name ?? "Agent",
      });
      await saveLesson({
        agentId: task.agentId,
        standing: classified.standing,
        rule: classified.rule,
        sourceTaskId: task.id,
      });
    }
  }
}
