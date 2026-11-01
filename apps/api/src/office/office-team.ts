import { prisma } from "@jaha-eye/database";
import {
  TeamPlanOutputSchema,
  assertDag,
  type OrchestrationGraph,
  type OfficeTaskRunMode,
} from "@jaha-eye/shared";
import { officeTeamMax } from "../lib/office-config.js";
import { startOrchestrationRun } from "../services/orchestration-service.js";
import { startRun } from "../services/run-service.js";
import { officeCompleteJson } from "./office-llm.js";

function stripTemplateSyntax(text: string): string {
  return text.replace(/\$\{[^}]+\}/g, "").trim();
}

async function linkSoloTeamRun(taskId: string, runId: string, mode: OfficeTaskRunMode) {
  await prisma.officeTaskRun.create({
    data: { taskId, runId, mode },
  });
}

export async function runTeamTask(input: {
  department: string;
  text: string;
  needsOk: boolean;
  taskId?: string;
  clockFired: boolean;
}): Promise<{ orchestrationId: string; parentRunId: string; pieceAgentIds: string[] }> {
  const dept = input.department.trim();
  const agents = await prisma.agent.findMany({
    where: { status: "active", department: dept },
    orderBy: { name: "asc" },
  });

  if (agents.length === 0) {
    throw new Error("No agents in department for team mode");
  }

  const lead = agents.find((agent) => agent.isDepartmentLead) ?? agents[0]!;
  const rosterLines = agents.map(
    (agent) => `- id=${agent.id} name=${agent.name} lead=${agent.isDepartmentLead}`,
  );

  const childMode: OfficeTaskRunMode =
    input.clockFired && input.needsOk ? "draft" : "normal";
  const linkMode: OfficeTaskRunMode =
    input.clockFired && input.needsOk ? "draft" : "team";

  let pieces: Array<{ agent: string; title: string; text: string }> = [];
  try {
    const plan = await officeCompleteJson({
      system: `Plan parallel team pieces. JSON: {pieces:[{agent,title,text}],why?}. Max ${officeTeamMax()} pieces. agent must be roster id.`,
      user: `Department: ${dept}\nLead: ${lead.name}\nRoster:\n${rosterLines.join("\n")}\n\nTask:\n${input.text}`,
      schema: TeamPlanOutputSchema,
    });
    pieces = plan.pieces.slice(0, officeTeamMax());
  } catch {
    pieces = [];
  }

  const usedAgents = new Set<string>();
  const uniquePieces = pieces.filter((piece) => {
    if (usedAgents.has(piece.agent)) return false;
    if (!agents.some((agent) => agent.id === piece.agent)) return false;
    usedAgents.add(piece.agent);
    return true;
  });

  if (uniquePieces.length === 0) {
    if (!input.taskId) {
      throw new Error("Team task requires taskId for solo fallback");
    }
    const runId = await startRun(lead.id, input.text, "manual", {
      context: { taskId: input.taskId, mode: childMode },
      beforeExecute: async (id) => {
        await linkSoloTeamRun(input.taskId!, id, linkMode);
      },
    });
    return { orchestrationId: "", parentRunId: runId, pieceAgentIds: [] };
  }

  const nodes: OrchestrationGraph["nodes"] = [];
  const edges: OrchestrationGraph["edges"] = [];

  uniquePieces.forEach((piece, index) => {
    const nodeId = `piece-${index + 1}`;
    nodes.push({
      id: nodeId,
      agentId: piece.agent,
      position: { x: index * 200, y: 0 },
      inputTemplate: stripTemplateSyntax(piece.text),
      outputVariable: `piece_${index + 1}`,
    });
  });

  const synthId = "lead-synth";
  const templateParts = uniquePieces.map((_, index) => `\${piece_${index + 1}}`);
  nodes.push({
    id: synthId,
    agentId: lead.id,
    position: { x: 200, y: 220 },
    inputTemplate: `Synthesize team deliverable from pieces:\n${templateParts.join("\n")}\n\nOriginal request:\n${input.text}`,
    outputVariable: "final",
  });

  uniquePieces.forEach((_, index) => {
    edges.push({
      id: `e-${index + 1}`,
      source: `piece-${index + 1}`,
      target: synthId,
    });
  });

  const graph: OrchestrationGraph = { nodes, edges };
  assertDag(graph);

  const slug = `team-${Date.now()}`;
  const orchestration = await prisma.orchestration.create({
    data: {
      name: `Team ${dept} ${new Date().toISOString()}`,
      slug,
      description: "Ephemeral team orchestration",
      hidden: true,
      graph,
      defaultRunInput: input.text,
    },
  });

  const pieceAgentIds = uniquePieces.map((piece) => piece.agent);

  const parentRunId = await startOrchestrationRun(orchestration.id, input.text, "manual", {
    continueOnNodeError: true,
    officeRunContext: input.taskId
      ? { taskId: input.taskId, mode: childMode }
      : undefined,
    beforeExecute: input.taskId
      ? async (runId) => {
          await prisma.officeTaskRun.create({
            data: { taskId: input.taskId!, runId, mode: linkMode },
          });
        }
      : undefined,
  });
  return { orchestrationId: orchestration.id, parentRunId, pieceAgentIds };
}
