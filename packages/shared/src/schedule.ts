import { Cron } from "croner";
import { z } from "zod";

export const ScheduleTargetTypeSchema = z.enum(["agent", "orchestration"]);
export type ScheduleTargetType = z.infer<typeof ScheduleTargetTypeSchema>;

export const LocalMinuteSlotSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Expected YYYY-MM-DDTHH:mm local wall clock slot");
export type LocalMinuteSlot = z.infer<typeof LocalMinuteSlotSchema>;

export function isValidCronExpression(expression: string): boolean {
  try {
    parseCron(expression);
    return true;
  } catch {
    return false;
  }
}

export const CronExpressionSchema = z
  .string()
  .min(1)
  .refine(isValidCronExpression, { message: "Invalid 5-field cron expression" });

export const ScheduleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  enabled: z.boolean(),
  targetType: ScheduleTargetTypeSchema,
  agentId: z.string().uuid().nullable(),
  orchestrationId: z.string().uuid().nullable(),
  expression: CronExpressionSchema,
  input: z.string().nullable(),
  lastFiredAt: z.coerce.date().nullable(),
  lastFiredSlot: LocalMinuteSlotSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Schedule = z.infer<typeof ScheduleSchema>;

const createScheduleBaseSchema = z.object({
  name: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
  targetType: ScheduleTargetTypeSchema,
  agentId: z.string().uuid().optional().nullable(),
  orchestrationId: z.string().uuid().optional().nullable(),
  expression: CronExpressionSchema,
  input: z.string().optional().nullable(),
});

function validateScheduleTarget(
  data: z.infer<typeof createScheduleBaseSchema>,
  ctx: z.RefinementCtx,
): void {
  if (data.targetType === "agent") {
    if (!data.agentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "agentId is required when targetType is agent",
        path: ["agentId"],
      });
    }
    if (data.orchestrationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "orchestrationId must be empty when targetType is agent",
        path: ["orchestrationId"],
      });
    }
    return;
  }

  if (!data.orchestrationId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "orchestrationId is required when targetType is orchestration",
      path: ["orchestrationId"],
    });
  }
  if (data.agentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "agentId must be empty when targetType is orchestration",
      path: ["agentId"],
    });
  }
}

export const CreateScheduleSchema = createScheduleBaseSchema.superRefine(validateScheduleTarget);
export type CreateScheduleInput = z.infer<typeof CreateScheduleSchema>;

export const UpdateScheduleSchema = createScheduleBaseSchema.partial().superRefine((data, ctx) => {
  if (data.targetType === undefined) return;
  validateScheduleTarget(
    {
      name: data.name ?? null,
      enabled: data.enabled ?? true,
      targetType: data.targetType,
      agentId: data.agentId ?? null,
      orchestrationId: data.orchestrationId ?? null,
      expression: data.expression ?? "* * * * *",
      input: data.input ?? null,
    },
    ctx,
  );
});
export type UpdateScheduleInput = z.infer<typeof UpdateScheduleSchema>;

export const FireScheduleSchema = z.object({
  slot: LocalMinuteSlotSchema,
});
export type FireScheduleInput = z.infer<typeof FireScheduleSchema>;

export const FireScheduleResponseSchema = z.object({
  runId: z.string().uuid(),
});
export type FireScheduleResponse = z.infer<typeof FireScheduleResponseSchema>;

export const FireScheduleSkippedResponseSchema = z.object({
  skipped: z.literal(true),
});
export type FireScheduleSkippedResponse = z.infer<typeof FireScheduleSkippedResponseSchema>;

/** Format a Date as YYYY-MM-DDTHH:mm in local wall clock time. */
export function formatLocalMinuteSlot(date: Date): LocalMinuteSlot {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function minuteStart(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    0,
    0,
  );
}

function parseCron(expression: string): Cron {
  return new Cron(expression.trim(), { paused: true });
}

/** True when the 5-field cron matches the local wall-clock minute of `at`. */
export function isCronDue(expression: string, at: Date): boolean {
  return parseCron(expression).match(minuteStart(at));
}

/** Next local occurrence after `from` (defaults to now). */
export function nextCronOccurrence(expression: string, from?: Date): Date {
  const next = parseCron(expression).nextRun(from ?? new Date());
  if (!next) {
    throw new Error("Cron expression has no upcoming occurrences");
  }
  return next;
}
