import { useCallback, useMemo } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AgentNode } from "./AgentNode";
import { newEdgeId, type AgentNodeData } from "./graph-utils";

const nodeTypes = { agentNode: AgentNode };

type OrchestrationCanvasProps = {
  nodes: Node<AgentNodeData>[];
  edges: Edge[];
  readOnly?: boolean;
  onNodesChange?: (changes: NodeChange<Node<AgentNodeData>>[]) => void;
  onEdgesChange?: (changes: EdgeChange[]) => void;
  onConnect?: (connection: Connection) => void;
  onNodeDragStop?: (node: Node<AgentNodeData>) => void;
  onSelectNode?: (nodeId: string | null) => void;
};

export function OrchestrationCanvas({
  nodes,
  edges,
  readOnly = false,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeDragStop,
  onSelectNode,
}: OrchestrationCanvasProps) {
  const handleConnect: OnConnect = useCallback(
    (connection) => {
      if (readOnly) return;
      onConnect?.(connection);
    },
    [readOnly, onConnect],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node[] }) => {
      if (readOnly) return;
      onSelectNode?.(selected[0]?.id ?? null);
    },
    [readOnly, onSelectNode],
  );

  const flowNodes = useMemo(() => nodes, [nodes]);

  return (
    <div className="h-full min-h-[420px] w-full border border-border bg-background/50 [&_.react-flow\_\_controls]:border-border [&_.react-flow\_\_controls]:bg-card [&_.react-flow\_\_controls-button]:border-border [&_.react-flow\_\_controls-button]:bg-card [&_.react-flow\_\_controls-button]:fill-accent">
      <ReactFlow
        nodes={flowNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : handleConnect}
        onNodeDragStop={(_, node) => onNodeDragStop?.(node as Node<AgentNodeData>)}
        onSelectionChange={onSelectionChange}
        onNodeClick={(_, node) => onSelectNode?.(node.id)}
        onPaneClick={() => onSelectNode?.(null)}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} color="rgb(125 249 255 / 0.06)" />
        <Controls showInteractive={!readOnly} />
      </ReactFlow>
    </div>
  );
}

export function connectEdge(
  edges: Edge[],
  connection: Connection,
): Edge[] {
  if (!connection.source || !connection.target) return edges;
  return addEdge(
    {
      ...connection,
      id: newEdgeId(connection.source, connection.target),
      type: "smoothstep",
    },
    edges,
  );
}
