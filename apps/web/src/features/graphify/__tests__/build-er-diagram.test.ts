import { describe, expect, it } from "vitest";
import { buildErDiagramMermaid, buildPipelineMermaid } from "../build-er-diagram";

describe("buildErDiagramMermaid", () => {
  it("builds mermaid erDiagram with foreign keys", () => {
    const mermaid = buildErDiagramMermaid({
      databaseName: "jaha_eye",
      tables: [
        { id: "agents", name: "agents" },
        { id: "agent_runs", name: "agent_runs" },
      ],
      foreignKeys: [{ fromTable: "agent_runs", toTable: "agents", relation: "references" }],
    });
    expect(mermaid).toContain("erDiagram");
    expect(mermaid).toContain("agent_runs");
    expect(mermaid).toContain("agents");
  });

  it("builds valid pipeline flowchart without reserved graph id", () => {
    const chart = buildPipelineMermaid(false);
    expect(chart).not.toMatch(/\bgraph\[/);
    expect(chart).toContain('graphFile["graph.json"]');
  });
});
