import { prisma } from "@jaha-eye/database";
import { extractAssistantReply, type OfficeUsage, type PersistedAgentEvent } from "@jaha-eye/shared";
import { mapEvent } from "../lib/mappers.js";

export async function recordRunUsage(runId: string): Promise<void> {
  const existing = await prisma.runUsage.findUnique({ where: { runId } });
  if (existing) return;

  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    include: { agent: true },
  });
  if (!run) return;

  const events = (
    await prisma.agentRunEvent.findMany({
      where: { runId },
      orderBy: { sequence: "asc" },
    })
  ).map(mapEvent);

  const reply = extractAssistantReply(events) ?? "";
  const inputMessage =
    typeof run.input === "object" && run.input !== null && "message" in run.input
      ? String((run.input as { message?: unknown }).message ?? "")
      : JSON.stringify(run.input);

  const inputTokens = Math.ceil(inputMessage.length / 4);
  const outputTokens = Math.ceil(reply.length / 4);

  await prisma.runUsage.create({
    data: {
      runId,
      inputTokens,
      outputTokens,
      model: run.agent?.modelName ?? "",
      estimated: true,
    },
  });
}

function sumUsage(rows: Array<{ inputTokens: number; outputTokens: number; estimated: boolean }>) {
  return rows.reduce(
    (acc, row) => ({
      inputTokens: acc.inputTokens + row.inputTokens,
      outputTokens: acc.outputTokens + row.outputTokens,
      estimated: acc.estimated || row.estimated,
    }),
    { inputTokens: 0, outputTokens: 0, estimated: false },
  );
}

export async function getOfficeUsage(): Promise<OfficeUsage> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const now = Date.now();
  const since5h = new Date(now - 5 * 60 * 60 * 1000);
  const since24h = new Date(now - 24 * 60 * 60 * 1000);

  const rows5h = await prisma.runUsage.findMany({ where: { createdAt: { gte: since5h } } });
  const rows24h = await prisma.runUsage.findMany({ where: { createdAt: { gte: since24h } } });

  const runs = await prisma.agentRun.findMany({
    where: { id: { in: rows24h.map((row) => row.runId) } },
    include: { agent: true },
  });
  const runById = new Map(runs.map((run) => [run.id, run]));

  const byAgentMap = new Map<
    string,
    { agentId: string; agentName: string; inputTokens: number; outputTokens: number }
  >();

  for (const usage of rows24h) {
    const run = runById.get(usage.runId);
    if (!run?.agentId || !run.agent) continue;
    const current = byAgentMap.get(run.agentId) ?? {
      agentId: run.agentId,
      agentName: run.agent.name,
      inputTokens: 0,
      outputTokens: 0,
    };
    byAgentMap.set(run.agentId, {
      ...current,
      inputTokens: current.inputTokens + usage.inputTokens,
      outputTokens: current.outputTokens + usage.outputTokens,
    });
  }

  return {
    window5h: sumUsage(rows5h),
    window24h: sumUsage(rows24h),
    budgetTokens: settings?.usageBudgetTokens ?? null,
    byAgent: [...byAgentMap.values()],
    reason: rows24h.length === 0 ? "No usage recorded yet" : null,
  };
}

export function estimateUsageFromEvents(events: PersistedAgentEvent[]): {
  inputTokens: number;
  outputTokens: number;
} {
  const reply = extractAssistantReply(events) ?? "";
  return {
    inputTokens: 0,
    outputTokens: Math.ceil(reply.length / 4),
  };
}
