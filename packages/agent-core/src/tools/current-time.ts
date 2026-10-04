import { tool } from "@strands-agents/sdk";
import { z } from "zod";

function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function formatCurrentTime(now = new Date(), timezone?: string) {
  const resolvedTimezone = timezone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (timezone?.trim() && !isValidTimezone(timezone.trim())) {
    return `Invalid timezone: "${timezone.trim()}". Use an IANA timezone such as Europe/London or America/New_York.`;
  }

  return JSON.stringify(
    {
      isoUtc: now.toISOString(),
      local: now.toLocaleString("en-US", {
        timeZone: resolvedTimezone,
        dateStyle: "full",
        timeStyle: "long",
      }),
      timezone: resolvedTimezone,
    },
    null,
    2,
  );
}

export const currentTimeTool = tool({
  name: "current_time",
  description:
    "Returns the current date and time as JSON with isoUtc, local (human-readable), and timezone fields. Prefer the local field when answering the user. Optionally pass an IANA timezone (e.g. Europe/London) to report local time for a specific region.",
  inputSchema: z.object({
    timezone: z
      .string()
      .optional()
      .describe("Optional IANA timezone (e.g. Europe/London, America/New_York)"),
  }),
  callback: async (input) => formatCurrentTime(new Date(), input.timezone),
});
