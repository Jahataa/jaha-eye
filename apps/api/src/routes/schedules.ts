import type { FastifyPluginAsync } from "fastify";
import {
  CreateScheduleSchema,
  FireScheduleSchema,
  UpdateScheduleSchema,
} from "@jaha-eye/shared";
import { mapSchedule } from "../lib/mappers.js";
import {
  createSchedule,
  deleteSchedule,
  disableSchedule,
  enableSchedule,
  fireSchedule,
  getSchedule,
  listSchedules,
  ScheduleFireSkippedError,
  ScheduleNotFoundError,
  updateSchedule,
} from "../services/schedule-service.js";

export const scheduleRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/schedules", async () => {
    const schedules = await listSchedules();
    return schedules.map(mapSchedule);
  });

  app.get<{ Params: { id: string } }>("/api/schedules/:id", async (req, reply) => {
    const schedule = await getSchedule(req.params.id);
    if (!schedule) return reply.status(404).send({ error: "Schedule not found" });
    return mapSchedule(schedule);
  });

  app.post("/api/schedules", async (req, reply) => {
    const parsed = CreateScheduleSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());

    try {
      const schedule = await createSchedule(parsed.data);
      return reply.status(201).send(mapSchedule(schedule));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create schedule";
      return reply.status(400).send({ error: message });
    }
  });

  app.patch<{ Params: { id: string } }>("/api/schedules/:id", async (req, reply) => {
    const parsed = UpdateScheduleSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());

    try {
      const schedule = await updateSchedule(req.params.id, parsed.data);
      return mapSchedule(schedule);
    } catch (error) {
      if (error instanceof ScheduleNotFoundError) {
        return reply.status(404).send({ error: "Schedule not found" });
      }
      const message = error instanceof Error ? error.message : "Failed to update schedule";
      return reply.status(400).send({ error: message });
    }
  });

  app.delete<{ Params: { id: string } }>("/api/schedules/:id", async (req, reply) => {
    try {
      await deleteSchedule(req.params.id);
      return reply.status(204).send();
    } catch (error) {
      if (error instanceof ScheduleNotFoundError) {
        return reply.status(404).send({ error: "Schedule not found" });
      }
      throw error;
    }
  });

  app.post<{ Params: { id: string } }>("/api/schedules/:id/enable", async (req, reply) => {
    try {
      const schedule = await enableSchedule(req.params.id);
      return mapSchedule(schedule);
    } catch (error) {
      if (error instanceof ScheduleNotFoundError) {
        return reply.status(404).send({ error: "Schedule not found" });
      }
      throw error;
    }
  });

  app.post<{ Params: { id: string } }>("/api/schedules/:id/disable", async (req, reply) => {
    try {
      const schedule = await disableSchedule(req.params.id);
      return mapSchedule(schedule);
    } catch (error) {
      if (error instanceof ScheduleNotFoundError) {
        return reply.status(404).send({ error: "Schedule not found" });
      }
      throw error;
    }
  });

  app.post<{ Params: { id: string } }>("/api/schedules/:id/fire", async (req, reply) => {
    const parsed = FireScheduleSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());

    try {
      const result = await fireSchedule(req.params.id, parsed.data.slot);
      return reply.status(202).send(result);
    } catch (error) {
      if (error instanceof ScheduleNotFoundError) {
        return reply.status(404).send({ error: "Schedule not found" });
      }
      if (error instanceof ScheduleFireSkippedError) {
        return reply.status(409).send({ skipped: true });
      }
      const message = error instanceof Error ? error.message : "Failed to fire schedule";
      return reply.status(400).send({ error: message });
    }
  });
};
