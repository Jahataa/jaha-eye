import { useQuery } from "@tanstack/react-query";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";

const brainNodeStyle = {
  background: "hsl(var(--card))",
  color: "hsl(var(--foreground))",
  border: "1px solid hsl(var(--accent) / 0.45)",
  borderRadius: 4,
  fontSize: 11,
  padding: "6px 10px",
  maxWidth: 160,
};

const brainEdgeStyle = { stroke: "hsl(var(--accent) / 0.6)", strokeWidth: 1.5 };

function layoutBrainNodes(
  nodes: Array<{ id: string; label: string }>,
  links: Array<{ source: string; target: string }>,
): Node[] {
  const idToIndex = new Map(nodes.map((node, index) => [node.id, index]));
  const placed = new Map<string, { x: number; y: number }>();

  for (const node of nodes) {
    const index = idToIndex.get(node.id) ?? 0;
    placed.set(node.id, { x: (index % 5) * 200, y: Math.floor(index / 5) * 120 });
  }

  for (let pass = 0; pass < 8; pass += 1) {
    for (const link of links) {
      const source = placed.get(link.source);
      const target = placed.get(link.target);
      if (!source || !target) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.hypot(dx, dy) || 1;
      const push = (180 - dist) * 0.08;
      target.x += (dx / dist) * push;
      target.y += (dy / dist) * push;
    }
  }

  return nodes.map((node) => ({
    id: node.id,
    data: { label: node.label },
    position: placed.get(node.id) ?? { x: 0, y: 0 },
    style: brainNodeStyle,
  }));
}

type OfficeBrainPanelProps = {
  onFocusFloor?: () => void;
};

export function OfficeBrainPanel({ onFocusFloor }: OfficeBrainPanelProps) {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["office-brain"],
    queryFn: api.getOfficeBrain,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[32rem] items-center justify-center rounded border border-border bg-card/60">
        <p className="text-sm text-muted">Loading brain graph…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[32rem] flex-col items-center justify-center gap-3 rounded border border-border bg-card/60 p-6 text-center">
        <p className="text-sm text-danger">
          {error instanceof Error ? error.message : "Could not load brain graph"}
        </p>
        <Button type="button" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data || data.notes.length === 0) {
    return (
      <div className="flex min-h-[32rem] flex-col items-center justify-center gap-3 rounded border border-dashed border-border bg-card/40 p-8 text-center">
        <p className="hud-kicker text-sm text-foreground">No brain notes yet</p>
        <p className="max-w-md text-sm text-muted">
          Deliverables from completed office tasks appear here as linked notes. Finish a task on the
          floor to seed the graph.
        </p>
        {onFocusFloor ? (
          <Button type="button" variant="outline" className="h-8 text-[10px] uppercase" onClick={onFocusFloor}>
            Back to floor
          </Button>
        ) : null}
      </div>
    );
  }

  const flowNodes = layoutBrainNodes(
    data.nodes.map((node) => ({ id: node.id, label: node.label })),
    data.links,
  );

  const edges: Edge[] = data.links.map((link, index) => ({
    id: `e-${index}`,
    source: link.source,
    target: link.target,
    style: brainEdgeStyle,
    animated: true,
  }));

  return (
    <div className="h-[32rem] w-full rounded border border-border bg-[#070b14]">
      <ReactFlow
        nodes={flowNodes}
        edges={edges}
        fitView
        colorMode="dark"
        className="h-full w-full"
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} color="hsl(var(--border))" />
        <MiniMap
          nodeColor="hsl(var(--accent))"
          maskColor="hsl(var(--background) / 0.75)"
          className="!bg-card/90"
        />
        <Controls className="!bg-card !border-border !shadow-md" />
      </ReactFlow>
    </div>
  );
}
