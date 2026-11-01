import type { GraphifyDatabaseSnapshot } from "@jaha-eye/shared";

type GraphNode = { id?: string; label?: string };
type GraphEdge = {
  source?: string;
  target?: string;
  relation?: string;
};

export type GraphJson = {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
};

const PG_PREFIX = "postgresql_";

function tableLabelFromNode(node: GraphNode): string | null {
  const id = node.id ?? "";
  if (!id.startsWith(PG_PREFIX) || !id.includes("_public_")) {
    return null;
  }
  const raw = node.label ?? id;
  return raw.replace(/^"public"\."(.+)"$/, "$1").replace(/^"(.+)"$/, "$1");
}

function isDatabaseRoot(node: GraphNode): boolean {
  const id = node.id ?? "";
  return id.startsWith(PG_PREFIX) && !id.includes("_public_");
}

export function parseDatabaseSnapshot(graph: GraphJson): GraphifyDatabaseSnapshot | null {
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];
  const root = nodes.find(isDatabaseRoot);
  if (!root) {
    return null;
  }

  const tableNodes = nodes.filter((n) => tableLabelFromNode(n) != null);
  const idToTable = new Map<string, string>();
  for (const node of tableNodes) {
    const name = tableLabelFromNode(node);
    if (name && node.id) {
      idToTable.set(node.id, name);
    }
  }

  const foreignKeys: GraphifyDatabaseSnapshot["foreignKeys"] = [];
  for (const edge of edges) {
    if (edge.relation !== "references") continue;
    const from = edge.source ? idToTable.get(edge.source) : undefined;
    const to = edge.target ? idToTable.get(edge.target) : undefined;
    if (!from || !to || from === to) continue;
    foreignKeys.push({
      fromTable: from,
      toTable: to,
      relation: edge.relation,
    });
  }

  const tables = [...idToTable.values()]
    .filter((name) => name !== "_prisma_migrations")
    .sort()
    .map((name) => ({
      name,
      id: name,
    }));

  return {
    databaseName: root.label ?? null,
    tables,
    foreignKeys,
  };
}

export function countPostgresNodes(graph: GraphJson): number {
  return (graph.nodes ?? []).filter((n) => (n.id ?? "").startsWith(PG_PREFIX)).length;
}
