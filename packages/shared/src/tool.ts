import { z } from "zod";

export const BuiltinToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

export type BuiltinTool = z.infer<typeof BuiltinToolSchema>;

export const BUILTIN_TOOL_CATALOG: BuiltinTool[] = [
  {
    id: "current_time",
    name: "Current Time",
    description: "Returns the current date and time in ISO format",
  },
];
