import { describe, expect, it } from "vitest";
import {
  CreateScheduleSchema,
  formatLocalMinuteSlot,
  isCronDue,
  isValidCronExpression,
  nextCronOccurrence,
} from "./schedule.js";

function localDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
): Date {
  return new Date(year, month - 1, day, hour, minute, second);
}

describe("formatLocalMinuteSlot", () => {
  it("formats local wall clock without seconds", () => {
    const slot = formatLocalMinuteSlot(localDate(2026, 10, 4, 8, 5, 59));
    expect(slot).toBe("2026-10-04T08:05");
  });
});

describe("isValidCronExpression", () => {
  it("accepts standard 5-field expressions", () => {
    expect(isValidCronExpression("* * * * *")).toBe(true);
    expect(isValidCronExpression("0 8 * * *")).toBe(true);
    expect(isValidCronExpression("0 8 * * 1-5")).toBe(true);
  });

  it("rejects invalid expressions", () => {
    expect(isValidCronExpression("not a cron")).toBe(false);
    expect(isValidCronExpression("60 * * * *")).toBe(false);
  });
});

describe("isCronDue", () => {
  it("matches every minute for * * * * *", () => {
    expect(isCronDue("* * * * *", localDate(2026, 10, 4, 8, 0, 45))).toBe(true);
    expect(isCronDue("* * * * *", localDate(2026, 10, 4, 8, 1, 0))).toBe(true);
  });

  it("matches only the configured minute and hour", () => {
    expect(isCronDue("0 8 * * *", localDate(2026, 10, 4, 8, 0, 30))).toBe(true);
    expect(isCronDue("0 8 * * *", localDate(2026, 10, 4, 8, 1, 0))).toBe(false);
    expect(isCronDue("0 8 * * *", localDate(2026, 10, 4, 7, 59, 59))).toBe(false);
  });

  it("matches weekday-only schedules", () => {
    // Sunday Oct 4 2026
    expect(isCronDue("0 9 * * 0", localDate(2026, 10, 4, 9, 0))).toBe(true);
    // Monday Oct 5 2026
    expect(isCronDue("0 9 * * 0", localDate(2026, 10, 5, 9, 0))).toBe(false);
  });
});

describe("nextCronOccurrence", () => {
  it("returns the next run later the same day", () => {
    const from = localDate(2026, 10, 4, 7, 30);
    const next = nextCronOccurrence("0 8 * * *", from);
    expect(next).toEqual(localDate(2026, 10, 4, 8, 0));
  });

  it("returns the next run on a later day when the time has passed", () => {
    const from = localDate(2026, 10, 4, 9, 0);
    const next = nextCronOccurrence("0 8 * * *", from);
    expect(next).toEqual(localDate(2026, 10, 5, 8, 0));
  });
});

describe("CreateScheduleSchema", () => {
  it("requires agentId for agent targets", () => {
    const result = CreateScheduleSchema.safeParse({
      targetType: "agent",
      expression: "0 8 * * *",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid agent schedule", () => {
    const result = CreateScheduleSchema.safeParse({
      targetType: "agent",
      agentId: "00000000-0000-4000-8000-000000000001",
      expression: "0 8 * * *",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mixed agent and orchestration targets", () => {
    const result = CreateScheduleSchema.safeParse({
      targetType: "orchestration",
      agentId: "00000000-0000-4000-8000-000000000001",
      orchestrationId: "00000000-0000-4000-8000-000000000002",
      expression: "0 8 * * *",
    });
    expect(result.success).toBe(false);
  });
});
