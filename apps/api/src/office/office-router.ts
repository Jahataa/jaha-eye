import { prisma } from "@jaha-eye/database";
import { RouterOutputSchema, type RouterOutput } from "@jaha-eye/shared";
import { heuristicNeedsOk } from "./office-prompt-composer.js";
import { officeCompleteJson } from "./office-llm.js";

function departmentKey(department: string): string {
  return department.trim().toLowerCase();
}

export async function routeOfficeTask(input: {
  department: string;
  text: string;
}): Promise<{ agentId: string; output: RouterOutput }> {
  const dept = input.department.trim();
  const agents = await prisma.agent.findMany({
    where: { status: "active" },
    orderBy: { name: "asc" },
  });

  const inDept = agents.filter((agent) => {
    const agentDept = agent.department?.trim();
    if (departmentKey(dept) === "general") {
      return !agentDept;
    }
    return agentDept?.toLowerCase() === departmentKey(dept);
  });
  const roster = inDept.length > 0 ? inDept : agents;

  if (roster.length === 0) {
    throw new Error("No active agents available for routing");
  }

  const rosterLines = roster.map(
    (agent) =>
      `- id=${agent.id} slug=${agent.slug} name=${agent.name} lead=${agent.isDepartmentLead} dept=${agent.department ?? "General"}`,
  );

  let parsed: RouterOutput;
  try {
    parsed = await officeCompleteJson({
      system:
        "You route operator tasks to one agent. Respond with JSON only: {agent,title,plan,eta_minutes,needs_ok}. agent must be an agent id from the roster.",
      user: `Department: ${dept}\nRoster:\n${rosterLines.join("\n")}\n\nTask:\n${input.text}`,
      schema: RouterOutputSchema,
    });
  } catch {
    const lead = roster.find((agent) => agent.isDepartmentLead) ?? roster[0]!;
    parsed = {
      agent: lead.id,
      title: input.text.slice(0, 80),
      plan: ["Review request", "Execute with available tools", "Summarize outcome"],
      eta_minutes: 15,
      needs_ok: heuristicNeedsOk(input.text),
    };
  }

  const match =
    roster.find((agent) => agent.id === parsed.agent) ??
    roster.find((agent) => agent.slug === parsed.agent) ??
    roster.find((agent) => agent.isDepartmentLead) ??
    roster[0]!;

  return {
    agentId: match.id,
    output: {
      ...parsed,
      agent: match.id,
      needs_ok: parsed.needs_ok || heuristicNeedsOk(input.text),
    },
  };
}
