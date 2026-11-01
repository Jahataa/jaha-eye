import type { FastifyPluginAsync } from "fastify";
import { GraphifyRebuildRequestSchema } from "@jaha-eye/shared";
import { getGraphifyStatus, startGraphifyRebuild } from "../services/graphify-service.js";

export const graphifyRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/graphify/status", async () => getGraphifyStatus());

  app.post("/api/graphify/rebuild", async (req, reply) => {
    const parsed = GraphifyRebuildRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send(parsed.error.flatten());
    }

    const result = startGraphifyRebuild(parsed.data);
    if (!result.ok) {
      return reply.status(409).send({ error: result.error });
    }
    return { started: true };
  });
};
