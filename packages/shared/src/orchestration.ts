import { z } from "zod";

export const OrchestrationStatusSchema = z.enum(["active", "disabled"]);
export type OrchestrationStatus = z.infer<typeof OrchestrationStatusSchema>;

export const GraphNodeSchema = z.object({
  id: z.string().min(1),
  agentId: z.string().uuid(),
  position: z.object({ x: z.number(), y: z.number() }),
});

export const GraphEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
});

export const OrchestrationGraphSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});

export type OrchestrationGraph = z.infer<typeof OrchestrationGraphSchema>;

export class DagValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DagValidationError";
  }
}

export function assertDag(graph: OrchestrationGraph): void {
  if (graph.nodes.length === 0) {
    throw new DagValidationError("Graph must have at least one node");
  }

  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      throw new DagValidationError(`Duplicate node id: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) {
      throw new DagValidationError(`Duplicate edge id: ${edge.id}`);
    }
    edgeIds.add(edge.id);
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source)) {
      throw new DagValidationError(`Edge source not found: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      throw new DagValidationError(`Edge target not found: ${edge.target}`);
    }
    if (edge.source === edge.target) {
      throw new DagValidationError("Self-loop edges are not allowed");
    }
  }

  const inDegree = new Map<string, number>();
  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
  }
  for (const edge of graph.edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const list = adjacency.get(edge.source) ?? [];
    list.push(edge.target);
    adjacency.set(edge.source, list);
  }

  const queue = [...inDegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([id]) => id);
  let visited = 0;

  while (queue.length > 0) {
    const id = queue.shift()!;
    visited++;
    for (const next of adjacency.get(id) ?? []) {
      const degree = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, degree);
      if (degree === 0) {
        queue.push(next);
      }
    }
  }

  if (visited !== graph.nodes.length) {
    throw new DagValidationError("Graph contains a cycle");
  }
}

export function topologicalWaves(graph: OrchestrationGraph): string[][] {
  assertDag(graph);

  const inDegree = new Map<string, number>();
  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
  }
  for (const edge of graph.edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const list = adjacency.get(edge.source) ?? [];
    list.push(edge.target);
    adjacency.set(edge.source, list);
  }

  let ready = [...inDegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([id]) => id);
  const waves: string[][] = [];

  while (ready.length > 0) {
    waves.push([...ready]);
    const nextReady: string[] = [];
    for (const id of ready) {
      for (const next of adjacency.get(id) ?? []) {
        const degree = (inDegree.get(next) ?? 0) - 1;
        inDegree.set(next, degree);
        if (degree === 0) {
          nextReady.push(next);
        }
      }
    }
    ready = nextReady;
  }

  return waves;
}

export function getUpstreamNodeIds(graph: OrchestrationGraph, nodeId: string): string[] {
  return graph.edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source);
}

export function sinkNodeIds(graph: OrchestrationGraph): string[] {
  const hasOutgoing = new Set(graph.edges.map((edge) => edge.source));
  return graph.nodes.filter((node) => !hasOutgoing.has(node.id)).map((node) => node.id);
}

export function composeNodeInput(
  original: string,
  dependencyOutputs: Array<{ nodeId: string; agentId: string; output: string }>,
): string {
  if (dependencyOutputs.length === 0) {
    return original;
  }

  const sections = dependencyOutputs.map(
    (dep) => `--- Output from node ${dep.nodeId} (agent ${dep.agentId}) ---\n${dep.output}`,
  );
  return `${original}\n\n${sections.join("\n\n")}`;
}

export const OrchestrationDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable(),
  status: OrchestrationStatusSchema,
  graph: OrchestrationGraphSchema,
  defaultRunInput: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type OrchestrationDefinition = z.infer<typeof OrchestrationDefinitionSchema>;

export const CreateOrchestrationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  graph: OrchestrationGraphSchema,
  defaultRunInput: z.string().optional().nullable(),
});

export type CreateOrchestrationInput = z.infer<typeof CreateOrchestrationSchema>;

export const UpdateOrchestrationSchema = CreateOrchestrationSchema.partial();
export type UpdateOrchestrationInput = z.infer<typeof UpdateOrchestrationSchema>;

export const StartOrchestrationSchema = z.object({
  input: z.string().default("Hello"),
});

export type StartOrchestrationInput = z.infer<typeof StartOrchestrationSchema>;

export function resolveDefaultOrchestrationInput(orchestration: {
  defaultRunInput?: string | null;
}): string {
  const trimmed = orchestration.defaultRunInput?.trim();
  if (trimmed) return trimmed;
  return "Hello";
}
