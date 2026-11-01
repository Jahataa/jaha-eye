import { z } from "zod";

export const GraphifyTableRefSchema = z.object({
  name: z.string(),
  id: z.string(),
});

export const GraphifyForeignKeySchema = z.object({
  fromTable: z.string(),
  toTable: z.string(),
  relation: z.string(),
});

export const GraphifyDatabaseSnapshotSchema = z.object({
  databaseName: z.string().nullable(),
  tables: z.array(GraphifyTableRefSchema),
  foreignKeys: z.array(GraphifyForeignKeySchema),
});

export const GraphifyRebuildPhaseSchema = z.enum([
  "idle",
  "running",
  "succeeded",
  "failed",
]);

export const GraphifyRebuildJobSchema = z.object({
  phase: GraphifyRebuildPhaseSchema,
  mode: z.enum(["extract", "update"]).nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  logTail: z.array(z.string()),
  error: z.string().nullable(),
});

export const GraphifyStatusSchema = z.object({
  enabled: z.boolean(),
  cliAvailable: z.boolean(),
  graphExists: z.boolean(),
  graphPath: z.string(),
  builtAt: z.string().nullable(),
  nodeCount: z.number(),
  edgeCount: z.number(),
  codeNodeCount: z.number(),
  database: GraphifyDatabaseSnapshotSchema.nullable(),
  rebuild: GraphifyRebuildJobSchema,
});

export type GraphifyStatus = z.infer<typeof GraphifyStatusSchema>;
export type GraphifyRebuildJob = z.infer<typeof GraphifyRebuildJobSchema>;
export type GraphifyDatabaseSnapshot = z.infer<typeof GraphifyDatabaseSnapshotSchema>;

export const GraphifyRebuildRequestSchema = z.object({
  mode: z.enum(["extract", "update"]).default("extract"),
  includePostgres: z.boolean().default(true),
});

export type GraphifyRebuildRequest = z.infer<typeof GraphifyRebuildRequestSchema>;
