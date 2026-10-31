import { describe, expect, it } from "vitest";
import { createDocSearch, searchDocs } from "../docs-search";
import { parseDocPage } from "../docs-parse";

const toolsPage = parseDocPage(
  "agents/tools",
  `# Tools\n\n## Web search (SearXNG)\n\nConfigure SEARXNG_URL.\n`,
);

describe("searchDocs", () => {
  it("finds pages and sections by query", () => {
    const index = createDocSearch([toolsPage]);
    const hits = searchDocs(index, "searxng");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.slug).toBe("agents/tools");
    expect(hits[0]?.anchor).toBe("web-search-searxng");
  });
});
