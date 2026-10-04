import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@jaha-eye/database";
import {
  assertDag,
  CreateOrchestrationSchema,
  DagValidationError,
  StartOrchestrationSchema,
  UpdateOrchestrationSchema,
  type OrchestrationGraph,
} from "@jaha-eye/shared";
import { mapOrchestration } from "../lib/mappers.js";
import { startOrchestrationRun } from "../services/orchestration-service.js";

function validateGraph(graph: OrchestrationGraph): string | null {
  try {
    assertDag(graph);
    return null;
  } catch (error) {
    if (error instanceof DagValidationError) {
      return error.message;
    }
    throw error;
  }
}

export const orchestrationRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/orchestrations", async () => {
    const orchestrations = await prisma.orchestration.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return orchestrations.map(mapOrchestration);
  });

  app.get<{ Params: { id: string } }>("/api/orchestrations/:id", async (req, reply) => {
    const orchestration = await prisma.orchestration.findUnique({
      where: { id: req.params.id },
    });
    if (!orchestration) return reply.status(404).send({ error: "Orchestration not found" });
    return mapOrchestration(orchestration);
  });

  app.post("/api/orchestrations", async (req, reply) => {
    const parsed = CreateOrchestrationSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());

    const graphError = validateGraph(parsed.data.graph);
    if (graphError) return reply.status(400).send({ error: graphError });

    try {
      const orchestration = await prisma.orchestration.create({ data: parsed.data });
      return reply.status(201).send(mapOrchestration(orchestration));
    } catch {
      return reply.status(409).send({ error: "Slug already exists" });
    }
  });

  app.patch<{ Params: { id: string } }>("/api/orchestrations/:id", async (req, reply) => {
    const parsed = UpdateOrchestrationSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());

    if (parsed.data.graph) {
      const graphError = validateGraph(parsed.data.graph);
      if (graphError) return reply.status(400).send({ error: graphError });
    }

    try {
      const orchestration = await prisma.orchestration.update({
        where: { id: req.params.id },
        data: parsed.data,
      });
      return mapOrchestration(orchestration);
    } catch {
      return reply.status(404).send({ error: "Orchestration not found" });
    }
  });

  app.delete<{ Params: { id: string } }>("/api/orchestrations/:id", async (req, reply) => {
    try {
      await prisma.orchestration.delete({ where: { id: req.params.id } });
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: "Orchestration not found" });
    }
  });

  app.post<{ Params: { id: string } }>("/api/orchestrations/:id/enable", async (req, reply) => {
    try {
      const orchestration = await prisma.orchestration.update({
        where: { id: req.params.id },
        data: { status: "active" },
      });
      return mapOrchestration(orchestration);
    } catch {
      return reply.status(404).send({ error: "Orchestration not found" });
    }
  });

  app.post<{ Params: { id: string } }>("/api/orchestrations/:id/disable", async (req, reply) => {
    try {
      const orchestration = await prisma.orchestration.update({
        where: { id: req.params.id },
        data: { status: "disabled" },
      });
      return mapOrchestration(orchestration);
    } catch {
      return reply.status(404).send({ error: "Orchestration not found" });
    }
  });

  app.post<{ Params: { id: string } }>("/api/orchestrations/:id/run", async (req, reply) => {
    const parsed = StartOrchestrationSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());

    try {
      const runId = await startOrchestrationRun(req.params.id, parsed.data.input);
      return reply.status(202).send({ runId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start orchestration run";
      return reply.status(400).send({ error: message });
    }
  });
};
