import { nextCronOccurrence } from "@jaha-eye/shared";
import type { OfficeTask, Routine, Schedule } from "@jaha-eye/shared";

export type CalendarEntryKind = "routine" | "scheduled-task" | "schedule";

export type CalendarEntry = {
  id: string;
  kind: CalendarEntryKind;
  label: string;
  at: Date;
  late?: boolean;
};

const MAX_CRON_STEPS = 400;

/** Collect cron firings with `at` in [rangeStart, rangeEnd). */
export function cronOccurrencesInRange(
  expression: string,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  const occurrences: Date[] = [];
  let cursor = new Date(rangeStart.getTime() - 1);

  for (let step = 0; step < MAX_CRON_STEPS; step += 1) {
    let next: Date;
    try {
      next = nextCronOccurrence(expression, cursor);
    } catch {
      break;
    }
    if (next >= rangeEnd) break;
    if (next >= rangeStart) occurrences.push(next);
    cursor = new Date(next.getTime() + 60_000);
  }

  return occurrences;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function addLocalDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function buildOfficeCalendarEntries(input: {
  routines: Routine[];
  tasks: OfficeTask[];
  schedules: Schedule[];
  rangeStart: Date;
  rangeEnd: Date;
}): CalendarEntry[] {
  const entries: CalendarEntry[] = [];

  for (const routine of input.routines) {
    if (!routine.enabled) continue;
    for (const at of cronOccurrencesInRange(routine.expression, input.rangeStart, input.rangeEnd)) {
      entries.push({
        id: `routine:${routine.id}:${at.toISOString()}`,
        kind: "routine",
        label: routine.name,
        at,
      });
    }
  }

  for (const schedule of input.schedules) {
    if (!schedule.enabled) continue;
    for (const at of cronOccurrencesInRange(schedule.expression, input.rangeStart, input.rangeEnd)) {
      entries.push({
        id: `schedule:${schedule.id}:${at.toISOString()}`,
        kind: "schedule",
        label: schedule.name ?? "Schedule",
        at,
      });
    }
  }

  for (const task of input.tasks) {
    if (task.status !== "scheduled" || !task.scheduledAt) continue;
    const at = new Date(task.scheduledAt);
    if (at >= input.rangeStart && at < input.rangeEnd) {
      entries.push({
        id: `task:${task.id}`,
        kind: "scheduled-task",
        label: task.title,
        at,
        late: task.late,
      });
    }
  }

  return entries.sort((a, b) => a.at.getTime() - b.at.getTime());
}
