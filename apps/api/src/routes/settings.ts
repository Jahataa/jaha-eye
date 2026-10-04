import type { FastifyPluginAsync } from "fastify";
import {
  TestLlmSettingsSchema,
  UpdateLlmSettingsSchema,
} from "@jaha-eye/shared";
import {
  getPublicSettings,
  testConnection,
  upsertSettings,
} from "../services/settings-service.js";

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/settings", async () => getPublicSettings());

  app.patch("/api/settings", async (req, reply) => {
    const parsed = UpdateLlmSettingsSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());

    try {
      return await upsertSettings(parsed.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save settings";
      return reply.status(500).send({ error: message });
    }
  });

  app.post("/api/settings/test", async (req, reply) => {
    const parsed = TestLlmSettingsSchema.safeParse(req.body ?? {});
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());

    return testConnection(parsed.data);
  });
};
