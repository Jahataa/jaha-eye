import { describe, expect, it } from "vitest";
import { formatCurrentTime } from "./current-time.js";

describe("formatCurrentTime", () => {
  const fixedDate = new Date("2026-10-04T08:30:00.000Z");

  it("returns structured UTC and local time", () => {
    const result = formatCurrentTime(fixedDate);
    const parsed = JSON.parse(result);

    expect(parsed.isoUtc).toBe("2026-10-04T08:30:00.000Z");
    expect(parsed.local).toBeTypeOf("string");
    expect(parsed.timezone).toBeTypeOf("string");
    expect(parsed.local.length).toBeGreaterThan(0);
  });

  it("formats local time for a requested IANA timezone", () => {
    const result = formatCurrentTime(fixedDate, "Europe/London");
    const parsed = JSON.parse(result);

    expect(parsed.timezone).toBe("Europe/London");
    expect(parsed.local).toContain("2026");
  });

  it("returns a clear error for invalid timezones", () => {
    const result = formatCurrentTime(fixedDate, "Not/A_Real_Zone");

    expect(result).toContain("Invalid timezone");
    expect(result).toContain("Not/A_Real_Zone");
    expect(result).toContain("IANA");
  });
});
