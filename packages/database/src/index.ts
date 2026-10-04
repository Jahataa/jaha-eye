import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient, Prisma };
export type {
  Agent,
  AgentRun,
  AgentRunEvent,
  AgentStatus,
  Orchestration,
  OrchestrationStatus,
  RunStatus,
  RunTrigger,
} from "@prisma/client";
