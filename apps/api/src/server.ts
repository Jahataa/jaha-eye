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
import { settingsRoutes } from "./routes/settings.js";

const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "0.0.0.0";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(agentRoutes);
await app.register(orchestrationRoutes);
await app.register(runRoutes);
await app.register(settingsRoutes);

app.get("/health", async () => ({ ok: true }));

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
