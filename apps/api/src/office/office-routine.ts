import { prisma } from "@jaha-eye/database";
import type { CreateRoutineInput, LocalMinuteSlot, UpdateRoutineInput } from "@jaha-eye/shared";
import { createOfficeTaskFromRoutine } from "./office-task-service.js";
import { mapRoutine } from "./office-mappers.js";

export class RoutineNotFoundError extends Error {
  constructor() {
    super("Routine not found");
    this.name = "RoutineNotFoundError";
  }
}

export class RoutineFireSkippedError extends Error {
  constructor() {
    super("Already fired for this slot");
    this.name = "RoutineFireSkippedError";
  }
}

export async function listRoutines() {
  return (await prisma.routine.findMany({ orderBy: { updatedAt: "desc" } })).map(mapRoutine);
}

export async function createRoutine(data: CreateRoutineInput) {
  const row = await prisma.routine.create({
    data: {
      name: data.name,
      department: data.department.trim(),
      agentId: data.agentId,
      text: data.text,
      expression: data.expression,
      needsOk: data.needsOk ?? true,
      team: data.team ?? false,
      enabled: data.enabled ?? true,
    },
  });
  return mapRoutine(row);
}

export async function updateRoutine(id: string, data: UpdateRoutineInput) {
  const existing = await prisma.routine.findUnique({ where: { id } });
  if (!existing) throw new RoutineNotFoundError();
  const row = await prisma.routine.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.department !== undefined ? { department: data.department.trim() } : {}),
      ...(data.agentId !== undefined ? { agentId: data.agentId } : {}),
      ...(data.text !== undefined ? { text: data.text } : {}),
      ...(data.expression !== undefined ? { expression: data.expression } : {}),
      ...(data.needsOk !== undefined ? { needsOk: data.needsOk } : {}),
      ...(data.team !== undefined ? { team: data.team } : {}),
      ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
    },
  });
  return mapRoutine(row);
}

export async function fireRoutine(id: string, slot: LocalMinuteSlot) {
  const routine = await prisma.routine.findUnique({ where: { id } });
  if (!routine || !routine.enabled) throw new RoutineNotFoundError();

  if (routine.lastFiredSlot === slot) {
    throw new RoutineFireSkippedError();
  }

  const updated = await prisma.routine.updateMany({
    where: { id, OR: [{ lastFiredSlot: null }, { lastFiredSlot: { not: slot } }] },
    data: {
      lastFiredSlot: slot,
      lastFiredAt: new Date(),
    },
  });

  if (updated.count === 0) {
    throw new RoutineFireSkippedError();
  }

  const task = await createOfficeTaskFromRoutine(routine.id);
  return task;
}
