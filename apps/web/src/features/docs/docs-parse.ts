import GithubSlugger from "github-slugger";

export type DocHeading = {
  level: 2 | 3;
  text: string;
  slug: string;
};

export type DocSectionId =
  | "overview"
  | "architecture"
  | "agents"
  | "ui"
  | "conf"
  | "src"
  | "planning";

export type DocPage = {
  slug: string;
  section: DocSectionId;
  title: string;
  headings: DocHeading[];
  body: string;
};

export const DOC_SECTIONS: { id: DocSectionId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "architecture", label: "Architecture" },
  { id: "agents", label: "Agents" },
  { id: "ui", label: "UI" },
  { id: "conf", label: "Config" },
  { id: "src", label: "Source" },
  { id: "planning", label: "Planning" },
];

export function slugFromGlobPath(globKey: string): string {
  const match = globKey.match(/docs\/(.+)\.md$/);
  if (!match) {
    return "README";
  }
  return match[1] ?? "README";
}

export function sectionForSlug(slug: string): DocSectionId {
  if (slug === "README") {
    return "overview";
  }
  const top = slug.split("/")[0];
  switch (top) {
    case "architecture":
      return "architecture";
    case "agents":
      return "agents";
    case "ui":
      return "ui";
    case "conf":
      return "conf";
    case "src":
      return "src";
    case "planning":
      return "planning";
    default:
      return "overview";
  }
}

export function parseDocPage(slug: string, body: string): DocPage {
  const lines = body.split("\n");
  let title = slug === "README" ? "Documentation" : (slug.split("/").pop() ?? slug);
  let sawH1 = false;
  const slugger = new GithubSlugger();
  const headings: DocHeading[] = [];

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1 && !sawH1) {
      title = h1[1]?.trim() ?? title;
      sawH1 = true;
      continue;
    }
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      const text = h2[1]?.trim() ?? "";
      headings.push({ level: 2, text, slug: slugger.slug(text) });
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      const text = h3[1]?.trim() ?? "";
      headings.push({ level: 3, text, slug: slugger.slug(text) });
    }
  }

  return {
    slug,
    section: sectionForSlug(slug),
    title,
    headings,
    body,
  };
}

export function sortDocPages(pages: DocPage[]): DocPage[] {
  const sectionOrder = new Map(DOC_SECTIONS.map((s, i) => [s.id, i]));
  return [...pages].sort((a, b) => {
    const sa = sectionOrder.get(a.section) ?? 99;
    const sb = sectionOrder.get(b.section) ?? 99;
    if (sa !== sb) {
      return sa - sb;
    }
    return a.title.localeCompare(b.title);
  });
}
