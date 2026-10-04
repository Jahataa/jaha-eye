import { prisma } from "@jaha-eye/database";
import type { Schedule } from "@jaha-eye/database";
import {
  resolveDefaultOrchestrationInput,
  resolveDefaultRunInput,
  type CreateScheduleInput,
  type LocalMinuteSlot,
  type UpdateScheduleInput,
} from "@jaha-eye/shared";
import { startOrchestrationRun } from "./orchestration-service.js";
import { startRun } from "./run-service.js";

export class ScheduleNotFoundError extends Error {
  constructor() {
    super("Schedule not found");
    this.name = "ScheduleNotFoundError";
  }
}

export class ScheduleFireSkippedError extends Error {
  constructor() {
    super("Already fired for this slot");
    this.name = "ScheduleFireSkippedError";
  }
}

function resolveScheduleInput(
  schedule: Schedule & {
    agent: { defaultRunInput: string | null; status: string } | null;
    orchestration: { defaultRunInput: string | null; status: string } | null;
  },
): string {
  const trimmed = schedule.input?.trim();
  if (trimmed) return trimmed;

  if (schedule.targetType === "agent" && schedule.agent) {
    return resolveDefaultRunInput(schedule.agent);
  }

  if (schedule.targetType === "orchestration" && schedule.orchestration) {
    return resolveDefaultOrchestrationInput(schedule.orchestration);
  }

  throw new Error("Schedule target not found");
}

async function assertScheduleTargetExists(data: {
  targetType: "agent" | "orchestration";
  agentId?: string | null;
  orchestrationId?: string | null;
}): Promise<void> {
  if (data.targetType === "agent") {
    const agent = await prisma.agent.findUnique({ where: { id: data.agentId! } });
    if (!agent) throw new Error("Agent not found");
    return;
  }

  const orchestration = await prisma.orchestration.findUnique({
    where: { id: data.orchestrationId! },
  });
  if (!orchestration) throw new Error("Orchestration not found");
}

export async function listSchedules(): Promise<Schedule[]> {
  return prisma.schedule.findMany({ orderBy: { updatedAt: "desc" } });
}

export async function getSchedule(id: string): Promise<Schedule | null> {
  return prisma.schedule.findUnique({ where: { id } });
}

export async function createSchedule(data: CreateScheduleInput): Promise<Schedule> {
  await assertScheduleTargetExists(data);

  return prisma.schedule.create({
    data: {
      name: data.name ?? null,
      enabled: data.enabled ?? true,
      targetType: data.targetType,
      agentId: data.targetType === "agent" ? data.agentId! : null,
      orchestrationId: data.targetType === "orchestration" ? data.orchestrationId! : null,
      expression: data.expression,
      input: data.input ?? null,
    },
  });
}

export async function updateSchedule(id: string, data: UpdateScheduleInput): Promise<Schedule> {
  const existing = await prisma.schedule.findUnique({ where: { id } });
  if (!existing) throw new ScheduleNotFoundError();

  const targetType = data.targetType ?? existing.targetType;
  const agentId =
    data.agentId !== undefined
      ? data.agentId
      : data.targetType !== undefined
        ? targetType === "agent"
          ? existing.agentId
          : null
        : existing.agentId;
  const orchestrationId =
    data.orchestrationId !== undefined
      ? data.orchestrationId
      : data.targetType !== undefined
        ? targetType === "orchestration"
          ? existing.orchestrationId
          : null
        : existing.orchestrationId;

  if (data.targetType !== undefined || data.agentId !== undefined || data.orchestrationId !== undefined) {
    await assertScheduleTargetExists({ targetType, agentId, orchestrationId });
  }

  try {
    return await prisma.schedule.update({
      where: { id },
      data: {
        ...data,
        agentId: data.targetType !== undefined ? (targetType === "agent" ? agentId : null) : data.agentId,
        orchestrationId:
          data.targetType !== undefined
            ? targetType === "orchestration"
              ? orchestrationId
              : null
            : data.orchestrationId,
      },
    });
  } catch {
    throw new ScheduleNotFoundError();
  }
}

export async function deleteSchedule(id: string): Promise<void> {
  try {
    await prisma.schedule.delete({ where: { id } });
  } catch {
    throw new ScheduleNotFoundError();
  }
}

export async function enableSchedule(id: string): Promise<Schedule> {
  try {
    return await prisma.schedule.update({
      where: { id },
      data: { enabled: true },
    });
  } catch {
    throw new ScheduleNotFoundError();
  }
}

export async function disableSchedule(id: string): Promise<Schedule> {
  try {
    return await prisma.schedule.update({
      where: { id },
      data: { enabled: false },
    });
  } catch {
    throw new ScheduleNotFoundError();
  }
}

export async function fireSchedule(
  id: string,
  slot: LocalMinuteSlot,
): Promise<{ runId: string }> {
  const schedule = await prisma.schedule.findUnique({
    where: { id },
    include: { agent: true, orchestration: true },
  });

  if (!schedule) {
    throw new ScheduleNotFoundError();
  }

  if (!schedule.enabled) {
    throw new Error("Schedule is disabled");
  }

  if (schedule.targetType === "agent") {
    if (!schedule.agent) throw new Error("Agent not found");
    if (schedule.agent.status === "disabled") throw new Error("Agent is disabled");
  } else {
    if (!schedule.orchestration) throw new Error("Orchestration not found");
    if (schedule.orchestration.status === "disabled") {
      throw new Error("Orchestration is disabled");
    }
  }

  const claim = await prisma.schedule.updateMany({
    where: {
      id,
      enabled: true,
      NOT: { lastFiredSlot: slot },
    },
    data: {
      lastFiredSlot: slot,
      lastFiredAt: new Date(),
    },
  });

  if (claim.count === 0) {
    const current = await prisma.schedule.findUnique({
      where: { id },
      select: { lastFiredSlot: true },
    });
    if (current?.lastFiredSlot === slot) {
      throw new ScheduleFireSkippedError();
    }
    throw new Error("Failed to claim schedule slot");
  }

  const input = resolveScheduleInput(schedule);

  const runId =
    schedule.targetType === "agent"
      ? await startRun(schedule.agentId!, input, "schedule")
      : await startOrchestrationRun(schedule.orchestrationId!, input, "schedule");

  return { runId };
}
