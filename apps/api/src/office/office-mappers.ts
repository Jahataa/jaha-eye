import type {
  BrainNote as DbBrainNote,
  Lesson as DbLesson,
  OfficeTask as DbOfficeTask,
  Routine as DbRoutine,
  Skill as DbSkill,
} from "@jaha-eye/database";
import type { BrainNote, Lesson, OfficeTask, Routine, Skill } from "@jaha-eye/shared";

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export function mapSkill(row: DbSkill): Skill {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    body: row.body,
    agentIds: stringArray(row.agentIds),
    departments: stringArray(row.departments),
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapLesson(row: DbLesson): Lesson {
  return {
    id: row.id,
    agentId: row.agentId,
    kind: row.kind,
    text: row.text,
    sourceTaskId: row.sourceTaskId,
    createdAt: row.createdAt,
  };
}

export function mapRoutine(row: DbRoutine): Routine {
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    agentId: row.agentId,
    text: row.text,
    expression: row.expression,
    needsOk: row.needsOk,
    team: row.team,
    enabled: row.enabled,
    lastFiredAt: row.lastFiredAt,
    lastFiredSlot: row.lastFiredSlot,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapBrainNote(row: DbBrainNote): BrainNote {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    body: row.body,
    kind: row.kind,
    agentId: row.agentId,
    taskId: row.taskId,
    runId: row.runId,
    links: stringArray(row.links),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapOfficeTask(
  row: DbOfficeTask,
  latestRunId?: string | null,
  teamPieceAgentIds?: string[],
): OfficeTask {
  const plan = Array.isArray(row.plan)
    ? row.plan.filter((entry): entry is string => typeof entry === "string")
    : [];

  return {
    id: row.id,
    department: row.department,
    agentId: row.agentId,
    title: row.title,
    text: row.text,
    status: row.status,
    needsOk: row.needsOk,
    plan,
    draft: row.draft,
    result: row.result,
    scheduledAt: row.scheduledAt,
    late: row.late,
    routineId: row.routineId,
    teamParentRunId: row.teamParentRunId,
    ...(teamPieceAgentIds && teamPieceAgentIds.length > 0
      ? { teamPieceAgentIds }
      : {}),
    latestRunId: latestRunId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
