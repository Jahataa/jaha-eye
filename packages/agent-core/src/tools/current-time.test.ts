import { describe, expect, it } from "vitest";
import { formatCurrentTime } from "./current-time.js";

describe("formatCurrentTime", () => {
  it("returns structured UTC and local time", () => {
    const result = formatCurrentTime(new Date("2026-10-04T08:30:00.000Z"));
    const parsed = JSON.parse(result);

    expect(parsed.isoUtc).toBe("2026-10-04T08:30:00.000Z");
    expect(parsed.local).toBeTypeOf("string");
    expect(parsed.timezone).toBeTypeOf("string");
    expect(parsed.local.length).toBeGreaterThan(0);
  });
});
