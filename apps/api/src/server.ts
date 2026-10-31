import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
import Fastify from "fastify";
import cors from "@fastify/cors";
import { agentRoutes } from "./routes/agents.js";
import { orchestrationRoutes } from "./routes/orchestrations.js";
import { runRoutes } from "./routes/runs.js";
import { scheduleRoutes } from "./routes/schedules.js";
import { settingsRoutes } from "./routes/settings.js";

const apiToken = process.env.API_TOKEN?.trim();
if (!apiToken) {
  console.error("[jaha-eye] API_TOKEN is required. Set it in .env before starting the API.");
  process.exit(1);
}

const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "127.0.0.1";
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: webOrigin,
  methods: ["GET", "POST", "PATCH", "DELETE"],
});

app.addHook("onRequest", async (req, reply) => {
  const path = req.url.split("?")[0] ?? req.url;
  if (path === "/health") {
    return;
  }
  if (!path.startsWith("/api/")) {
    return;
  }

  const header = req.headers.authorization;
  if (header !== `Bearer ${apiToken}`) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
});

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  if (!reply.sent) {
    void reply.status(500).send({ error: "Internal server error" });
  }
});

await app.register(agentRoutes);
await app.register(orchestrationRoutes);
await app.register(runRoutes);
await app.register(scheduleRoutes);
await app.register(settingsRoutes);

app.get("/health", async () => ({ ok: true }));

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
