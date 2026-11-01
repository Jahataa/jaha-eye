import { describe, expect, it } from "vitest";
import { buildOfficeCalendarEntries, cronOccurrencesInRange, startOfLocalDay } from "./office-calendar";

describe("office-calendar", () => {
  it("lists cron occurrences within a day range", () => {
    const start = new Date(2026, 0, 1, 0, 0, 0, 0);
    const end = new Date(2026, 0, 2, 0, 0, 0, 0);
    const hits = cronOccurrencesInRange("0 9 * * *", start, end);
    expect(hits.length).toBe(1);
    expect(hits[0]?.getHours()).toBe(9);
  });

  it("merges routines, schedules, and scheduled tasks", () => {
    const rangeStart = startOfLocalDay(new Date(2026, 5, 1));
    const rangeEnd = new Date(2026, 5, 8);
    const at = new Date(2026, 5, 3, 14, 30, 0, 0);

    const entries = buildOfficeCalendarEntries({
      rangeStart,
      rangeEnd,
      routines: [],
      schedules: [],
      tasks: [
        {
          id: "t1",
          department: "General",
          agentId: null,
          title: "Ship report",
          text: "report",
          status: "scheduled",
          needsOk: false,
          plan: [],
          draft: null,
          result: null,
          scheduledAt: at,
          late: true,
          routineId: null,
          teamParentRunId: null,
          latestRunId: null,
          createdAt: at,
          updatedAt: at,
        },
      ],
    });

    expect(entries.some((entry) => entry.kind === "scheduled-task" && entry.late)).toBe(true);
  });
});
