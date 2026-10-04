import { tool } from "@strands-agents/sdk";

export function formatCurrentTime(now = new Date()) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return JSON.stringify(
    {
      isoUtc: now.toISOString(),
      local: now.toLocaleString("en-US", {
        timeZone: timezone,
        dateStyle: "full",
        timeStyle: "long",
      }),
      timezone,
    },
    null,
    2,
  );
}

export const currentTimeTool = tool({
  name: "current_time",
  description:
    "Returns the current date and time as JSON with isoUtc, local (human-readable), and timezone fields. Prefer the local field when answering the user.",
  inputSchema: {
    type: "object",
    properties: {},
  },
  callback: async () => formatCurrentTime(),
});
