import { tool } from "@strands-agents/sdk";

export const currentTimeTool = tool({
  name: "current_time",
  description: "Returns the current date and time in ISO 8601 format",
  inputSchema: {
    type: "object",
    properties: {},
  },
  callback: async () => {
    return new Date().toISOString();
  },
});
