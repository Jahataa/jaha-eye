import { prisma } from "@jaha-eye/database";

export function normalizeWikiLinkTarget(raw: string): string {
  const withoutBlock = raw.split("#")[0]?.trim() ?? raw;
  const pipe = withoutBlock.split("|")[0]?.trim() ?? withoutBlock;
  const segments = pipe.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? pipe;
}

function scoreWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3)
    .slice(0, 24);
}

function departmentIndexTitle(department: string): string {
  const key = department.trim().toLowerCase();
  return `${key} index`;
}

export async function pickContextNoteTitles(input: {
  taskText: string;
  department?: string | null;
}): Promise<string[]> {
  const notes = await prisma.brainNote.findMany({
    orderBy: { updatedAt: "desc" },
    take: 80,
  });

  const keywords = scoreWords(input.taskText);
  const deptKey = input.department?.trim().toLowerCase() ?? "";

  const scored = notes
    .map((note) => {
      const titleLower = note.title.toLowerCase();
      const bodyLower = note.body.toLowerCase();
      let score = 0;
      for (const word of keywords) {
        if (titleLower.includes(word)) score += 3;
        if (bodyLower.includes(word)) score += 1;
      }
      if (deptKey && titleLower === departmentIndexTitle(deptKey)) {
        score += 2;
      }
      return { note, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((entry) => entry.note.title);

  const indexTitle = deptKey ? departmentIndexTitle(deptKey) : null;
  if (indexTitle) {
    const hasIndex = notes.some((note) => note.title.toLowerCase() === indexTitle);
    if (hasIndex && !scored.some((title) => title.toLowerCase() === indexTitle)) {
      scored.push(
        notes.find((note) => note.title.toLowerCase() === indexTitle)!.title,
      );
    }
  }

  return scored.slice(0, 5);
}
