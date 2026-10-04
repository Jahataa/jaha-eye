import type { OrchestrationGraph } from "@jaha-eye/shared";
import type { Edge, Node } from "@xyflow/react";

export type AgentOption = {
  id: string;
  name: string;
  slug: string;
};

export type AgentNodeData = {
  agentId: string;
  agentName: string;
  agentSlug: string;
  outputVariable?: string | null;
  inputTemplate?: string | null;
  systemPrompt?: string | null;
  /** Run-detail canvas: highlight when selected in inspector (not React Flow selected) */
  inspectorSelected?: boolean;
  status?: string;
  /** Editor-only: show hover controls and agent swap picker */
  editable?: boolean;
  isEditing?: boolean;
  agentOptions?: AgentOption[];
  onSwap?: () => void;
  onDelete?: () => void;
  onAgentChange?: (agentId: string) => void;
};

export function graphToFlow(
  graph: OrchestrationGraph,
  agentLookup: Map<string, { name: string; slug: string }>,
): { nodes: Node<AgentNodeData>[]; edges: Edge[] } {
  const nodes: Node<AgentNodeData>[] = graph.nodes.map((node) => {
    const agent = agentLookup.get(node.agentId);
    return {
      id: node.id,
      type: "agentNode",
      position: node.position,
      data: {
        agentId: node.agentId,
        agentName: agent?.name ?? node.agentId.slice(0, 8),
        agentSlug: agent?.slug ?? "unknown",
        outputVariable: node.outputVariable ?? null,
        inputTemplate: node.inputTemplate ?? null,
        systemPrompt: node.systemPrompt ?? null,
      },
    };
  });

  const edges: Edge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
  }));

  return { nodes, edges };
}

export function flowToGraph(nodes: Node<AgentNodeData>[], edges: Edge[]): OrchestrationGraph {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      agentId: node.data.agentId,
      position: node.position,
      outputVariable: node.data.outputVariable ?? null,
      inputTemplate: node.data.inputTemplate ?? null,
      systemPrompt: node.data.systemPrompt ?? null,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    })),
  };
}

export function newNodeId(): string {
  return crypto.randomUUID();
}

export function newEdgeId(source: string, target: string): string {
  return `${source}->${target}`;
}
