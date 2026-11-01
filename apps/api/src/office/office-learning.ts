import { prisma } from "@jaha-eye/database";
import { ClassifierOutputSchema } from "@jaha-eye/shared";
import { officeCompleteJson } from "./office-llm.js";

export async function classifyFeedback(input: {
  feedback: string;
  agentName: string;
}): Promise<{ standing: boolean; rule: string }> {
  try {
    const parsed = await officeCompleteJson({
      system:
        'Classify operator feedback. JSON only: {"standing":boolean,"rule":string}. standing=true for reusable process rules.',
      user: `Agent: ${input.agentName}\nFeedback:\n${input.feedback}`,
      schema: ClassifierOutputSchema,
    });
    return parsed;
  } catch {
    return { standing: false, rule: input.feedback.slice(0, 500) };
  }
}

export async function saveLesson(input: {
  agentId: string;
  standing: boolean;
  rule: string;
  sourceTaskId?: string;
}): Promise<void> {
  const text = input.rule.trim();
  if (!text) return;

  await prisma.lesson.create({
    data: {
      agentId: input.agentId,
      kind: input.standing ? "standing" : "oneoff",
      text,
      sourceTaskId: input.sourceTaskId ?? null,
    },
  });
}

export async function deleteLesson(id: string): Promise<void> {
  await prisma.lesson.delete({ where: { id } });
}
