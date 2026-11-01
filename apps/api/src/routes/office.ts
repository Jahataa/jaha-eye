import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@jaha-eye/database";
import {
  CreateOfficeTaskSchema,
  CreateRoutineSchema,
  CreateSkillSchema,
  FireScheduleSchema,
  RejectOfficeTaskSchema,
  ReviseOfficeTaskSchema,
  UpdateRoutineSchema,
  UpdateSkillSchema,
} from "@jaha-eye/shared";
import { mapSkill } from "../office/office-mappers.js";
import { getBrainGraph } from "../office/office-brain.js";
import { checkOfficeRateLimit } from "../office/office-rate-limit.js";
import {
  createRoutine,
  fireRoutine,
  listRoutines,
  RoutineFireSkippedError,
  RoutineNotFoundError,
  updateRoutine,
} from "../office/office-routine.js";
import { deleteLesson } from "../office/office-learning.js";
import { getOfficeUsage } from "../office/office-usage.js";
import {
  approveOfficeTask,
  createOfficeTask,
  getOfficeTask,
  listOfficeTasks,
  OfficeTaskScheduleError,
  promoteDueScheduledTasks,
  rejectOfficeTask,
  reviseOfficeTask,
} from "../office/office-task-service.js";

function rateLimitOrReply(reply: { status: (code: number) => { send: (body: unknown) => unknown } }) {
  const gate = checkOfficeRateLimit("office-llm", 30, 60_000);
  if (!gate.allowed) {
    return reply.status(429).send({ error: "Office LLM rate limit exceeded" });
  }
  return null;
}

export const officeRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/office/tasks", async () => listOfficeTasks());

  app.get<{ Params: { id: string } }>("/api/office/tasks/:id", async (req, reply) => {
    const task = await getOfficeTask(req.params.id);
    if (!task) return reply.status(404).send({ error: "Task not found" });
    return task;
  });

  app.post("/api/office/tasks", async (req, reply) => {
    const limited = rateLimitOrReply(reply);
    if (limited) return limited;

    const parsed = CreateOfficeTaskSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());

    try {
      const task = await createOfficeTask(parsed.data);
      return reply.status(201).send(task);
    } catch (error) {
      if (error instanceof OfficeTaskScheduleError) {
        return reply.status(400).send({ error: error.message });
      }
      throw error;
    }
  });

  app.post<{ Params: { id: string } }>("/api/office/tasks/:id/approve", async (req, reply) => {
    try {
      return await approveOfficeTask(req.params.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Approve failed";
      return reply.status(400).send({ error: message });
    }
  });

  app.post<{ Params: { id: string } }>("/api/office/tasks/:id/reject", async (req, reply) => {
    const parsed = RejectOfficeTaskSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    try {
      return await rejectOfficeTask(req.params.id, parsed.data.feedback);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Reject failed";
      return reply.status(400).send({ error: message });
    }
  });

  app.post<{ Params: { id: string } }>("/api/office/tasks/:id/revise", async (req, reply) => {
    const limited = rateLimitOrReply(reply);
    if (limited) return limited;

    const parsed = ReviseOfficeTaskSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    try {
      return await reviseOfficeTask(req.params.id, parsed.data.feedback);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Revise failed";
      return reply.status(400).send({ error: message });
    }
  });

  app.get("/api/office/skills", async () => {
    const rows = await prisma.skill.findMany({ orderBy: { updatedAt: "desc" } });
    return rows.map(mapSkill);
  });

  app.post("/api/office/skills", async (req, reply) => {
    const parsed = CreateSkillSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    try {
      const row = await prisma.skill.create({
        data: {
          name: parsed.data.name,
          slug: parsed.data.slug,
          body: parsed.data.body,
          agentIds: parsed.data.agentIds,
          departments: parsed.data.departments,
          enabled: parsed.data.enabled ?? true,
        },
      });
      return reply.status(201).send(mapSkill(row));
    } catch {
      return reply.status(409).send({ error: "Skill slug already exists" });
    }
  });

  app.patch<{ Params: { id: string } }>("/api/office/skills/:id", async (req, reply) => {
    const parsed = UpdateSkillSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    try {
      const row = await prisma.skill.update({ where: { id: req.params.id }, data: parsed.data });
      return mapSkill(row);
    } catch {
      return reply.status(404).send({ error: "Skill not found" });
    }
  });

  app.delete<{ Params: { id: string } }>("/api/office/skills/:id", async (req, reply) => {
    try {
      await prisma.skill.delete({ where: { id: req.params.id } });
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: "Skill not found" });
    }
  });

  app.get<{ Querystring: { agentId?: string } }>("/api/office/lessons", async (req) => {
    const rows = await prisma.lesson.findMany({
      where: req.query.agentId ? { agentId: req.query.agentId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows;
  });

  app.delete<{ Params: { id: string } }>("/api/office/lessons/:id", async (req, reply) => {
    try {
      await deleteLesson(req.params.id);
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: "Lesson not found" });
    }
  });

  app.get("/api/office/routines", async () => listRoutines());

  app.post("/api/office/routines", async (req, reply) => {
    const parsed = CreateRoutineSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    const routine = await createRoutine(parsed.data);
    return reply.status(201).send(routine);
  });

  app.patch<{ Params: { id: string } }>("/api/office/routines/:id", async (req, reply) => {
    const parsed = UpdateRoutineSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    try {
      return await updateRoutine(req.params.id, parsed.data);
    } catch (error) {
      if (error instanceof RoutineNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  app.post<{ Params: { id: string } }>("/api/office/routines/:id/fire", async (req, reply) => {
    const parsed = FireScheduleSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    try {
      await promoteDueScheduledTasks();
      const task = await fireRoutine(req.params.id, parsed.data.slot);
      return reply.status(202).send({ task });
    } catch (error) {
      if (error instanceof RoutineFireSkippedError) {
        return reply.status(409).send({ skipped: true });
      }
      if (error instanceof RoutineNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  app.post("/api/office/tick", async () => {
    await promoteDueScheduledTasks();
    return { ok: true };
  });

  app.get("/api/office/brain", async () => getBrainGraph());

  app.get("/api/office/usage", async () => getOfficeUsage());
};
