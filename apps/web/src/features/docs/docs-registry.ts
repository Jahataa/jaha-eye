import { parseDocPage, sortDocPages, type DocPage } from "./docs-parse";

const rawModules = import.meta.glob("../../../../../docs/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function buildRegistry(): DocPage[] {
  const pages = Object.entries(rawModules).map(([path, body]) => {
    const slugMatch = path.match(/docs\/(.+)\.md$/);
    const slug = slugMatch?.[1] ?? "README";
    return parseDocPage(slug, body);
  });
  return sortDocPages(pages);
}

export const DOC_PAGES: DocPage[] = buildRegistry();

export function getDocPage(slug: string | undefined): DocPage | undefined {
  const key = slug?.replace(/^\/+|\/+$/g, "") || "README";
  if (key === "" || key === "docs") {
    return DOC_PAGES.find((p) => p.slug === "README");
  }
  return DOC_PAGES.find((p) => p.slug === key);
}

export function getAdjacentDocs(slug: string): {
  prev: DocPage | null;
  next: DocPage | null;
} {
  const idx = DOC_PAGES.findIndex((p) => p.slug === slug);
  if (idx === -1) {
    return { prev: null, next: null };
  }
  return {
    prev: idx > 0 ? (DOC_PAGES[idx - 1] ?? null) : null,
    next: idx < DOC_PAGES.length - 1 ? (DOC_PAGES[idx + 1] ?? null) : null,
  };
}
