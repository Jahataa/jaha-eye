import MiniSearch from "minisearch";
import type { DocPage } from "./docs-parse";

export type DocSearchResult = {
  id: string;
  slug: string;
  title: string;
  sectionTitle?: string;
  anchor?: string;
  snippet: string;
};

type SearchRecord = {
  id: string;
  slug: string;
  title: string;
  sectionTitle: string;
  anchor: string;
  text: string;
};

function excerpt(text: string, query: string, radius = 48): string {
  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  const idx = q ? lower.indexOf(q.split(/\s+/)[0] ?? "") : 0;
  const start = Math.max(0, idx === -1 ? 0 : idx - radius);
  const slice = text.slice(start, start + radius * 2 + q.length);
  const prefix = start > 0 ? "…" : "";
  const suffix = start + slice.length < text.length ? "…" : "";
  return `${prefix}${slice.trim()}${suffix}`;
}

function buildRecords(pages: DocPage[]): SearchRecord[] {
  const records: SearchRecord[] = [];
  for (const page of pages) {
    records.push({
      id: page.slug,
      slug: page.slug,
      title: page.title,
      sectionTitle: "",
      anchor: "",
      text: `${page.title}\n${page.body}`,
    });
    for (const heading of page.headings) {
      if (heading.level !== 2) {
        continue;
      }
      const sectionStart = page.body.indexOf(`## ${heading.text}`);
      const nextHeading = page.headings.find(
        (h) => h.level === 2 && page.body.indexOf(`## ${h.text}`) > sectionStart && h.text !== heading.text,
      );
      const end = nextHeading
        ? page.body.indexOf(`## ${nextHeading.text}`, sectionStart + 1)
        : page.body.length;
      const sectionBody =
        sectionStart >= 0 ? page.body.slice(sectionStart, end === -1 ? undefined : end) : "";
      records.push({
        id: `${page.slug}#${heading.slug}`,
        slug: page.slug,
        title: page.title,
        sectionTitle: heading.text,
        anchor: heading.slug,
        text: `${heading.text}\n${sectionBody}`,
      });
    }
  }
  return records;
}

export function createDocSearch(pages: DocPage[]): MiniSearch<SearchRecord> {
  const mini = new MiniSearch<SearchRecord>({
    fields: ["title", "sectionTitle", "text"],
    storeFields: ["slug", "title", "sectionTitle", "anchor", "text"],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { title: 3, sectionTitle: 2 },
    },
  });
  mini.addAll(buildRecords(pages));
  return mini;
}

export function searchDocs(mini: MiniSearch<SearchRecord>, query: string, limit = 12): DocSearchResult[] {
  const q = query.trim();
  if (!q) {
    return [];
  }
  const hits = mini.search(q, { prefix: true, fuzzy: 0.2, boost: { title: 3, sectionTitle: 2 } });
  return hits.slice(0, limit).map((hit) => {
    const text = String(hit.text ?? "");
    return {
      id: String(hit.id),
      slug: String(hit.slug),
      title: String(hit.title),
      sectionTitle: hit.sectionTitle ? String(hit.sectionTitle) : undefined,
      anchor: hit.anchor ? String(hit.anchor) : undefined,
      snippet: excerpt(text, q),
    };
  });
}
