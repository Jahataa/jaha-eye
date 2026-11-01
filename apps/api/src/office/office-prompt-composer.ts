import { prisma } from "@jaha-eye/database";
import { BUILTIN_TOOL_CATALOG, type AgentDefinition } from "@jaha-eye/shared";
import type { RunExecutionContext } from "../services/run-hooks.js";
import { pickContextNoteTitles } from "./office-note-context.js";

const MAX_BRIEF_CHARS = 4000;
const MAX_SKILL_CHARS = 6000;
const MAX_LESSON_CHARS = 3000;
const MAX_BRAIN_CHARS = 4000;

const SAFE_TOOL_IDS = new Set(
  BUILTIN_TOOL_CATALOG.filter((tool) => tool.risk === "safe").map((tool) => tool.id),
);

const OUTBOUND_KEYWORDS = /\b(send|email|post|pay|purchase|transfer|publish|tweet|slack)\b/i;

export function heuristicNeedsOk(text: string): boolean {
  return OUTBOUND_KEYWORDS.test(text);
}

function appendSection(prompt: string, heading: string, body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return prompt;
  return `${prompt}\n\n## ${heading}\n${trimmed}`;
}

function cap(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

export async function composeOfficePrompt(
  definition: AgentDefinition,
  ctx: RunExecutionContext,
): Promise<AgentDefinition> {
  let systemPrompt = definition.systemPrompt;
  let tools = [...definition.tools];

  if (definition.brief?.trim()) {
    systemPrompt = appendSection(systemPrompt, "Agent brief", cap(definition.brief.trim(), MAX_BRIEF_CHARS));
  }

  const skills = await prisma.skill.findMany({ where: { enabled: true } });
  const deptKey = definition.department?.trim().toLowerCase() ?? "";
  const skillBlocks: string[] = [];
  let skillChars = 0;

  for (const skill of skills) {
    const agentIds = stringArray(skill.agentIds);
    const departments = stringArray(skill.departments).map((entry) => entry.toLowerCase());
    const unbound = agentIds.length === 0 && departments.length === 0;
    const bindsAgent = agentIds.includes(definition.id);
    const bindsDept = deptKey.length > 0 && departments.includes(deptKey);
    if (!unbound && !bindsAgent && !bindsDept) continue;

    const block = `### ${skill.name}\n${skill.body.trim()}`;
    if (skillChars + block.length > MAX_SKILL_CHARS) break;
    skillBlocks.push(block);
    skillChars += block.length;
  }

  if (skillBlocks.length > 0) {
    systemPrompt = appendSection(systemPrompt, "Skills", skillBlocks.join("\n\n"));
  }

  const lessons = await prisma.lesson.findMany({
    where: { agentId: definition.id, kind: "standing" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (lessons.length > 0) {
    const lines: string[] = [];
    let used = 0;
    for (const lesson of lessons) {
      const line = `- ${lesson.text.trim()}`;
      if (used + line.length > MAX_LESSON_CHARS) break;
      lines.push(line);
      used += line.length;
    }
    if (lines.length > 0) {
      systemPrompt = appendSection(systemPrompt, "Standing rules", lines.join("\n"));
    }
  }

  const taskRow = ctx.taskId
    ? await prisma.officeTask.findUnique({
        where: { id: ctx.taskId },
        select: { text: true, department: true },
      })
    : null;

  const contextTitles = taskRow
    ? await pickContextNoteTitles({
        taskText: taskRow.text,
        department: taskRow.department,
      })
    : [];

  if (contextTitles.length > 0) {
    const notes = await prisma.brainNote.findMany({
      where: { title: { in: contextTitles } },
    });
    const byTitle = new Map(notes.map((note) => [note.title, note]));
    const excerpts = contextTitles
      .map((title) => byTitle.get(title))
      .filter((note): note is NonNullable<typeof note> => Boolean(note))
      .map((note) => {
        const excerpt = cap(note.body.trim(), 800);
        return `- [[${note.title}]]: ${excerpt}`;
      });
    if (excerpts.length > 0) {
      systemPrompt = appendSection(
        systemPrompt,
        "Relevant brain notes",
        cap(excerpts.join("\n"), MAX_BRAIN_CHARS),
      );
    }
  }

  if (ctx.mode === "draft") {
    systemPrompt = appendSection(
      systemPrompt,
      "Draft mode",
      "Produce a draft only. Do not send emails, post messages, make payments, or perform irreversible outbound actions.",
    );
    tools = tools.filter((toolId) => SAFE_TOOL_IDS.has(toolId));
  }

  if (ctx.mode === "approve") {
    systemPrompt = appendSection(
      systemPrompt,
      "Approval mode",
      "The operator approved the draft. Execute the outbound actions described in the draft using available tools.",
    );
  }

  if (ctx.mode === "revise") {
    systemPrompt = appendSection(
      systemPrompt,
      "Revision mode",
      "Revise the prior deliverable using operator feedback quoted in the user message.",
    );
  }

  if (systemPrompt === definition.systemPrompt && tools.join(",") === definition.tools.join(",")) {
    return definition;
  }

  return { ...definition, systemPrompt, tools };
}
