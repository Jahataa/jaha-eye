import type { GraphifyDatabaseSnapshot } from "@jaha-eye/shared";

function mermaidId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function buildErDiagramMermaid(database: GraphifyDatabaseSnapshot | null): string | null {
  if (!database || database.tables.length === 0) {
    return null;
  }

  const lines = ["erDiagram"];
  const linked = new Set<string>();
  for (const fk of database.foreignKeys) {
    linked.add(fk.fromTable);
    linked.add(fk.toTable);
  }
  for (const table of database.tables) {
    if (linked.has(table.name)) continue;
    lines.push(`  ${mermaidId(table.name)} {`);
    lines.push(`    string ${table.name}`);
    lines.push("  }");
  }

  const seen = new Set<string>();
  for (const fk of database.foreignKeys) {
    const key = `${fk.fromTable}->${fk.toTable}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(
      `  ${mermaidId(fk.toTable)} ||--o{ ${mermaidId(fk.fromTable)} : ${fk.relation}`,
    );
  }

  return lines.join("\n");
}

export function buildPipelineMermaid(running: boolean): string {
  const lines = [
    "flowchart LR",
    '  codeAst["Code AST"] --> graphFile["graph.json"]',
    "  pgDb[(PostgreSQL)] --> graphFile",
    '  graphFile --> apiStatus["API status"]',
    '  apiStatus --> uiScreen["Graphify screen"]',
    "  classDef running fill:#0e7490,stroke:#22d3ee,color:#fff",
  ];
  if (running) {
    lines.push("  class graphFile,pgDb running");
  }
  return lines.join("\n");
}
