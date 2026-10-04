import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@jaha-eye/database";
import { mapEvent, mapRun, mapRunChild } from "../lib/mappers.js";
import { cancelRun } from "../services/run-service.js";
import { eventBus } from "../services/event-bus.js";

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

export const runRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/runs", async () => {
    const runs = await prisma.agentRun.findMany({
      where: { parentRunId: null },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return runs.map(mapRun);
  });

  app.get<{ Params: { id: string } }>("/api/runs/:id", async (req, reply) => {
    const run = await prisma.agentRun.findUnique({ where: { id: req.params.id } });
    if (!run) return reply.status(404).send({ error: "Run not found" });

    const children = await prisma.agentRun.findMany({
      where: { parentRunId: run.id },
      select: { id: true, agentId: true, graphNodeId: true, status: true },
      orderBy: { createdAt: "asc" },
    });

    return {
      ...mapRun(run),
      children: children.map(mapRunChild),
    };
  });

  app.get<{ Params: { id: string } }>("/api/runs/:id/events", async (req, reply) => {
    const run = await prisma.agentRun.findUnique({ where: { id: req.params.id } });
    if (!run) return reply.status(404).send({ error: "Run not found" });

    const events = await prisma.agentRunEvent.findMany({
      where: { runId: req.params.id },
      orderBy: { sequence: "asc" },
    });
    return events.map(mapEvent);
  });

  app.post<{ Params: { id: string } }>("/api/runs/:id/cancel", async (req, reply) => {
    const run = await prisma.agentRun.findUnique({ where: { id: req.params.id } });
    if (!run) return reply.status(404).send({ error: "Run not found" });
    if (TERMINAL.has(run.status)) {
      return reply.status(400).send({ error: "Run already finished" });
    }
    await cancelRun(req.params.id);
    const updated = await prisma.agentRun.findUniqueOrThrow({ where: { id: req.params.id } });
    return mapRun(updated);
  });

  app.get<{ Params: { id: string } }>("/api/runs/:id/stream", async (req, reply) => {
    const run = await prisma.agentRun.findUnique({ where: { id: req.params.id } });
    if (!run) return reply.status(404).send({ error: "Run not found" });

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const existing = await prisma.agentRunEvent.findMany({
      where: { runId: req.params.id },
      orderBy: { sequence: "asc" },
    });

    let lastSequence = 0;
    for (const event of existing) {
      lastSequence = event.sequence;
      reply.raw.write(`data: ${JSON.stringify(mapEvent(event))}\n\n`);
    }

    if (TERMINAL.has(run.status)) {
      reply.raw.end();
      return reply;
    }

    const unsubscribe = eventBus.subscribe(req.params.id, (event) => {
      if (event.sequence > lastSequence) {
        lastSequence = event.sequence;
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      }
      if (event.type === "RUN_FINISHED" || event.type === "RUN_ERROR") {
        reply.raw.end();
        unsubscribe();
      }
    });

    req.raw.on("close", () => {
      unsubscribe();
    });

    const poll = setInterval(async () => {
      const current = await prisma.agentRun.findUnique({ where: { id: req.params.id } });
      if (current && TERMINAL.has(current.status)) {
        clearInterval(poll);
        unsubscribe();
        reply.raw.end();
      }
    }, 1000);

    req.raw.on("close", () => clearInterval(poll));

    return reply;
  });
};
