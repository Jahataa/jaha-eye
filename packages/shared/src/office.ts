import { z } from "zod";

export const OfficeTaskStatusSchema = z.enum([
  "routing",
  "queued",
  "running",
  "waiting",
  "done",
  "error",
  "cancelled",
  "scheduled",
]);
export type OfficeTaskStatus = z.infer<typeof OfficeTaskStatusSchema>;

export const OfficeTaskRunModeSchema = z.enum(["normal", "draft", "approve", "revise", "team"]);
export type OfficeTaskRunMode = z.infer<typeof OfficeTaskRunModeSchema>;

export const LessonKindSchema = z.enum(["standing", "oneoff"]);
export type LessonKind = z.infer<typeof LessonKindSchema>;

export const RouterOutputSchema = z.object({
  agent: z.string().min(1),
  title: z.string().min(1).max(120),
  plan: z.array(z.string().max(200)).max(8).default([]),
  eta_minutes: z.number().int().min(1).max(480).optional(),
  needs_ok: z.boolean().default(false),
});
export type RouterOutput = z.infer<typeof RouterOutputSchema>;

export const CreateOfficeTaskSchema = z.object({
  department: z.string().trim().min(1).max(40),
  text: z.string().trim().min(1).max(8000),
  team: z.boolean().optional(),
  agentId: z.string().uuid().optional(),
  at: z.coerce.date().optional().nullable(),
});
export type CreateOfficeTaskInput = z.infer<typeof CreateOfficeTaskSchema>;

export const ReviseOfficeTaskSchema = z.object({
  feedback: z.string().trim().min(1).max(4000),
});
export type ReviseOfficeTaskInput = z.infer<typeof ReviseOfficeTaskSchema>;

export const RejectOfficeTaskSchema = ReviseOfficeTaskSchema;
export type RejectOfficeTaskInput = z.infer<typeof RejectOfficeTaskSchema>;

export const ClassifierOutputSchema = z.object({
  standing: z.boolean(),
  rule: z.string().max(500),
});
export type ClassifierOutput = z.infer<typeof ClassifierOutputSchema>;

export const TeamPlanPieceSchema = z.object({
  agent: z.string().min(1),
  title: z.string().min(1).max(120),
  text: z.string().min(1).max(4000),
});
export const TeamPlanOutputSchema = z.object({
  pieces: z.array(TeamPlanPieceSchema).min(1).max(8),
  why: z.string().max(500).optional(),
});
export type TeamPlanOutput = z.infer<typeof TeamPlanOutputSchema>;

export const SkillSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  body: z.string(),
  agentIds: z.array(z.string().uuid()),
  departments: z.array(z.string()),
  enabled: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Skill = z.infer<typeof SkillSchema>;

export const CreateSkillSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  body: z.string().min(1).max(20000),
  agentIds: z.array(z.string().uuid()).default([]),
  departments: z.array(z.string().max(40)).default([]),
  enabled: z.boolean().default(true),
});
export type CreateSkillInput = z.infer<typeof CreateSkillSchema>;

export const UpdateSkillSchema = CreateSkillSchema.partial();
export type UpdateSkillInput = z.infer<typeof UpdateSkillSchema>;

export const LessonSchema = z.object({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
  kind: LessonKindSchema,
  text: z.string(),
  sourceTaskId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
});
export type Lesson = z.infer<typeof LessonSchema>;

export const OfficeTaskSchema = z.object({
  id: z.string().uuid(),
  department: z.string(),
  agentId: z.string().uuid().nullable(),
  title: z.string(),
  text: z.string(),
  status: OfficeTaskStatusSchema,
  needsOk: z.boolean(),
  plan: z.array(z.string()),
  draft: z.string().nullable(),
  result: z.string().nullable(),
  scheduledAt: z.coerce.date().nullable(),
  late: z.boolean(),
  routineId: z.string().uuid().nullable(),
  teamParentRunId: z.string().uuid().nullable(),
  teamPieceAgentIds: z.array(z.string().uuid()).optional(),
  latestRunId: z.string().uuid().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type OfficeTask = z.infer<typeof OfficeTaskSchema>;

export const RoutineSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  department: z.string(),
  agentId: z.string().uuid(),
  text: z.string(),
  expression: z.string(),
  needsOk: z.boolean(),
  team: z.boolean(),
  enabled: z.boolean(),
  lastFiredAt: z.coerce.date().nullable(),
  lastFiredSlot: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Routine = z.infer<typeof RoutineSchema>;

export const CreateRoutineSchema = z.object({
  name: z.string().min(1),
  department: z.string().trim().min(1).max(40),
  agentId: z.string().uuid(),
  text: z.string().min(1).max(8000),
  expression: z.string().min(1),
  needsOk: z.boolean().optional(),
  team: z.boolean().optional(),
  enabled: z.boolean().optional(),
});
export type CreateRoutineInput = z.infer<typeof CreateRoutineSchema>;

export const UpdateRoutineSchema = CreateRoutineSchema.partial();
export type UpdateRoutineInput = z.infer<typeof UpdateRoutineSchema>;

export const BrainNoteSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  body: z.string(),
  kind: z.enum(["note", "deliverable"]),
  agentId: z.string().uuid().nullable(),
  taskId: z.string().uuid().nullable(),
  runId: z.string().uuid().nullable(),
  links: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type BrainNote = z.infer<typeof BrainNoteSchema>;

export const BrainGraphSchema = z.object({
  notes: z.array(BrainNoteSchema),
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      g: z.number().optional(),
    }),
  ),
  links: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
    }),
  ),
});
export type BrainGraph = z.infer<typeof BrainGraphSchema>;

export const OfficeUsageSchema = z.object({
  window5h: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    estimated: z.boolean(),
  }),
  window24h: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    estimated: z.boolean(),
  }),
  budgetTokens: z.number().nullable(),
  byAgent: z.array(
    z.object({
      agentId: z.string().uuid(),
      agentName: z.string(),
      inputTokens: z.number(),
      outputTokens: z.number(),
    }),
  ),
  reason: z.string().nullable(),
});
export type OfficeUsage = z.infer<typeof OfficeUsageSchema>;
