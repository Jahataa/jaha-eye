import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "@jaha-eye/database";
import type { BrainGraph } from "@jaha-eye/shared";
import { brainExportDir } from "../lib/office-config.js";
import { mapBrainNote } from "./office-mappers.js";
import { normalizeWikiLinkTarget, pickContextNoteTitles } from "./office-note-context.js";

const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;

export function extractWikiLinks(body: string): string[] {
  const links = new Set<string>();
  for (const match of body.matchAll(WIKI_LINK_REGEX)) {
    const label = match[1]?.trim();
    if (label) links.add(label);
  }
  return [...links];
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "note";
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;
  while (await prisma.brainNote.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function writeDeliverableNote(input: {
  title: string;
  body: string;
  agentId: string | null;
  taskId: string;
  runId: string;
  model: string;
  tools: string[];
  department?: string;
  taskText?: string;
}): Promise<void> {
  const wikiLinks = extractWikiLinks(input.body);
  const contextTitles =
    input.taskText != null
      ? await pickContextNoteTitles({
          taskText: input.taskText,
          department: input.department ?? null,
        })
      : [];
  const links = [...new Set([...wikiLinks, ...contextTitles])];
  const slug = await uniqueSlug(input.title);
  const frontMatter = [
    "---",
    `agent: ${input.agentId ?? ""}`,
    `task: ${input.taskId}`,
    `run: ${input.runId}`,
    `model: ${input.model}`,
    `tools: ${input.tools.join(", ")}`,
    "---",
    "",
  ].join("\n");

  const markdown = `${frontMatter}# ${input.title}\n\n${input.body}\n\nRead: ${links.map((link) => `[[${link}]]`).join(" ")}\n`;

  await prisma.brainNote.create({
    data: {
      slug,
      title: input.title,
      body: markdown,
      kind: "deliverable",
      agentId: input.agentId,
      taskId: input.taskId,
      runId: input.runId,
      links,
    },
  });

  const exportDir = brainExportDir();
  if (exportDir) {
    const dir = resolve(exportDir);
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, `${slug}.md`), markdown, "utf8");
  }
}

export async function getBrainGraph(): Promise<BrainGraph> {
  const notes = (
    await prisma.brainNote.findMany({ orderBy: { updatedAt: "desc" } })
  ).map(mapBrainNote);
  const titleToId = new Map(notes.map((note) => [note.title.toLowerCase(), note.id]));
  const nodes = notes.map((note, index) => ({
    id: note.id,
    label: note.title,
    g: index,
  }));
  const links: BrainGraph["links"] = [];

  for (const note of notes) {
    for (const link of note.links) {
      const normalized = normalizeWikiLinkTarget(link).toLowerCase();
      const targetId =
        titleToId.get(normalized) ??
        titleToId.get(link.toLowerCase()) ??
        notes.find((entry) => entry.slug.toLowerCase() === normalized)?.id;
      if (targetId && targetId !== note.id) {
        links.push({ source: note.id, target: targetId });
      }
    }
  }

  return { notes, nodes, links };
}
