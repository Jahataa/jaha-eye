import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@jaha-eye/database";
import {
  CreateAgentSchema,
  getRolePresets,
  StartRunSchema,
  UpdateAgentSchema,
} from "@jaha-eye/shared";
import { getBuiltinToolCatalog } from "@jaha-eye/agent-core";
import { mapAgent } from "../lib/mappers.js";
import { isAgentReferencedInOrchestrations } from "../services/orchestration-service.js";
import { startRun } from "../services/run-service.js";

export const agentRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/agents", async () => {
    const agents = await prisma.agent.findMany({ orderBy: { updatedAt: "desc" } });
    return agents.map(mapAgent);
  });

  app.get("/api/tools", async () => getBuiltinToolCatalog());

  app.get("/api/role-presets", async () => getRolePresets());

  app.get<{ Params: { id: string } }>("/api/agents/:id", async (req, reply) => {
    const agent = await prisma.agent.findUnique({ where: { id: req.params.id } });
    if (!agent) return reply.status(404).send({ error: "Agent not found" });
    return mapAgent(agent);
  });

  app.post("/api/agents", async (req, reply) => {
    const parsed = CreateAgentSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());

    try {
      const agent = await prisma.agent.create({ data: parsed.data });
      return reply.status(201).send(mapAgent(agent));
    } catch {
      return reply.status(409).send({ error: "Slug already exists" });
    }
  });

  app.patch<{ Params: { id: string } }>("/api/agents/:id", async (req, reply) => {
    const parsed = UpdateAgentSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());

    try {
      const agent = await prisma.agent.update({
        where: { id: req.params.id },
        data: parsed.data,
      });
      return mapAgent(agent);
    } catch {
      return reply.status(404).send({ error: "Agent not found" });
    }
  });

  app.delete<{ Params: { id: string } }>("/api/agents/:id", async (req, reply) => {
    const agent = await prisma.agent.findUnique({ where: { id: req.params.id } });
    if (!agent) return reply.status(404).send({ error: "Agent not found" });

    if (await isAgentReferencedInOrchestrations(req.params.id)) {
      return reply.status(409).send({ error: "Agent is referenced by an orchestration" });
    }

    try {
      await prisma.agent.delete({ where: { id: req.params.id } });
      return reply.status(204).send();
    } catch {
      return reply.status(404).send({ error: "Agent not found" });
    }
  });

  app.post<{ Params: { id: string } }>("/api/agents/:id/enable", async (req, reply) => {
    try {
      const agent = await prisma.agent.update({
        where: { id: req.params.id },
        data: { status: "active" },
      });
      return mapAgent(agent);
    } catch {
      return reply.status(404).send({ error: "Agent not found" });
    }
  });

  app.post<{ Params: { id: string } }>("/api/agents/:id/disable", async (req, reply) => {
    try {
      const agent = await prisma.agent.update({
        where: { id: req.params.id },
        data: { status: "disabled" },
      });
      return mapAgent(agent);
    } catch {
      return reply.status(404).send({ error: "Agent not found" });
    }
  });

  app.post<{ Params: { id: string } }>("/api/agents/:id/run", async (req, reply) => {
    const parsed = StartRunSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());

    try {
      const runId = await startRun(req.params.id, parsed.data.input);
      return reply.status(202).send({ runId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start run";
      return reply.status(400).send({ error: message });
    }
  });
};
