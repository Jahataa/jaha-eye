import { describe, expect, it } from "vitest";
import { parseDocPage, sectionForSlug, slugFromGlobPath } from "../docs-parse";

const sample = `# Built-in tools

Intro paragraph.

## Catalog

Items here.

### Nested

Detail.

## Web search (SearXNG)

Configure search.
`;

describe("parseDocPage", () => {
  it("extracts title and level-2/3 headings with github slugs", () => {
    const page = parseDocPage("agents/tools", sample);
    expect(page.title).toBe("Built-in tools");
    expect(page.section).toBe("agents");
    expect(page.headings.map((h) => h.slug)).toEqual([
      "catalog",
      "nested",
      "web-search-searxng",
    ]);
  });
});

describe("slugFromGlobPath", () => {
  it("maps vite glob keys to slugs", () => {
    expect(slugFromGlobPath("/Users/x/jaha-eye/docs/agents/tools.md")).toBe("agents/tools");
    expect(slugFromGlobPath("../../../../../docs/README.md")).toBe("README");
  });
});

describe("sectionForSlug", () => {
  it("assigns sections from top-level folder", () => {
    expect(sectionForSlug("README")).toBe("overview");
    expect(sectionForSlug("architecture/events")).toBe("architecture");
    expect(sectionForSlug("planning/roadmap")).toBe("planning");
  });
});
