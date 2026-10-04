import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AgentRunDetail, OrchestrationGraph, RunChildSummary } from "@jaha-eye/shared";
import { api } from "../../lib/api";
import { Card, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { EventTimeline } from "../../components/events/EventTimeline";
import { OrchestrationCanvas } from "../orchestrations/OrchestrationCanvas";
import { OrchestrationNodeInspector } from "../orchestrations/OrchestrationNodeInspector";
import { graphToFlow, type AgentNodeData } from "../orchestrations/graph-utils";
import { useRunStream } from "../../hooks/use-run-stream";
import type { Node, Edge } from "@xyflow/react";

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

function parseRunGraph(input: unknown): OrchestrationGraph | null {
  if (typeof input !== "object" || input === null) return null;
  const record = input as { graph?: OrchestrationGraph };
  if (!record.graph?.nodes || !record.graph?.edges) return null;
  return record.graph;
}

function childByNodeId(children: RunChildSummary[]): Map<string, RunChildSummary> {
  const map = new Map<string, RunChildSummary>();
  for (const child of children) {
    if (child.graphNodeId) map.set(child.graphNodeId, child);
  }
  return map;
}

function ChildTimeline({ runId, status }: { runId: string; status: string }) {
  const { data: history = [] } = useQuery({
    queryKey: ["runs", runId, "events"],
    queryFn: () => api.getRunEvents(runId),
  });

  const { liveEvents } = useRunStream(runId, status);

  const events = useMemo(() => {
    const map = new Map<number, (typeof history)[0]>();
    for (const e of history) map.set(e.sequence, e);
    for (const e of liveEvents) map.set(e.sequence, e);
    return [...map.values()].sort((a, b) => a.sequence - b.sequence);
  }, [history, liveEvents]);

  const isLive = !TERMINAL.has(status);

  return <EventTimeline events={events} live={isLive} />;
}

type OrchestrationRunViewProps = {
  run: AgentRunDetail;
  orchestrationName?: string;
};

type InspectorTab = "summary" | "events";

export function OrchestrationRunView({ run, orchestrationName }: OrchestrationRunViewProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("summary");

  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: api.getAgents });
  const { data: orchestrations = [] } = useQuery({
    queryKey: ["orchestrations"],
    queryFn: api.getOrchestrations,
    enabled: !orchestrationName && !!run.orchestrationId,
  });

  const agentLookup = useMemo(
    () => new Map(agents.map((a) => [a.id, { name: a.name, slug: a.slug }])),
    [agents],
  );

  const graph = parseRunGraph(run.input);
  const children = run.children ?? [];
  const childMap = useMemo(() => childByNodeId(children), [children]);

  const resolvedOrchName =
    orchestrationName ??
    orchestrations.find((o) => o.id === run.orchestrationId)?.name ??
    "Orchestration";

  const nodeStatuses = useMemo(() => {
    const statuses = new Map<string, string>();
    if (!graph) return statuses;
    for (const node of graph.nodes) {
      const child = childMap.get(node.id);
      statuses.set(node.id, child?.status ?? "queued");
    }
    return statuses;
  }, [graph, childMap]);

  const flowGraph = useMemo(() => {
    if (!graph) return { nodes: [] as Node<AgentNodeData>[], edges: [] as Edge[] };
    const flow = graphToFlow(graph, agentLookup);
    return {
      nodes: flow.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          status: nodeStatuses.get(node.id),
          inspectorSelected: node.id === selectedNodeId,
        },
      })),
      edges: flow.edges,
    };
  }, [graph, agentLookup, nodeStatuses, selectedNodeId]);

  const selectedChild = selectedNodeId ? childMap.get(selectedNodeId) : undefined;
  const selectedGraphNode = selectedNodeId
    ? graph?.nodes.find((node) => node.id === selectedNodeId)
    : undefined;
  const selectedAgent = selectedChild?.agentId
    ? agents.find((agent) => agent.id === selectedChild.agentId)
    : undefined;

  const handleSelectNode = (nodeId: string | null) => {
    setSelectedNodeId((current) => {
      if (current === nodeId) return current;
      return nodeId;
    });
    if (nodeId) setInspectorTab("summary");
  };

  const isLive = !TERMINAL.has(run.status);
  const runningCount = isLive ? children.filter((c) => c.status === "running").length : 0;
  const queuedCount = isLive ? children.filter((c) => c.status === "queued").length : 0;
  const waitingHint =
    isLive && queuedCount > 0
      ? `Waiting on ${queuedCount} of ${graph?.nodes.length ?? children.length}…`
      : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {resolvedOrchName}
        {runningCount > 0 && (
          <span className="hud-mono ml-3 text-accent">
            {runningCount} node{runningCount === 1 ? "" : "s"} running
          </span>
        )}
        {waitingHint && <span className="hud-mono ml-3 text-warning">{waitingHint}</span>}
      </p>

      <div className="grid min-h-[480px] grid-cols-[220px_1fr] gap-4 lg:grid-cols-[220px_1fr_320px]">
        <Card className="flex flex-col overflow-hidden p-0">
          <div className="border-b border-border p-3">
            <CardTitle className="text-xs">Run tree</CardTitle>
          </div>
          <ul className="flex-1 overflow-y-auto p-2">
            <li className="border-b border-border/50 px-2 py-2">
              <button
                type="button"
                onClick={() => handleSelectNode(null)}
                className="w-full text-left text-sm font-semibold hover:text-accent"
              >
                Parent run
              </button>
              <Badge status={run.status} className="mt-1" />
            </li>
            {graph?.nodes.map((node) => {
              const child = childMap.get(node.id);
              const agent = agents.find((a) => a.id === node.agentId);
              const label = agent?.name ?? node.agentId.slice(0, 8);
              const status = child?.status ?? "queued";
              return (
                <li key={node.id} className="border-b border-border/50 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => handleSelectNode(node.id)}
                    className="w-full px-2 py-2 text-left hover:bg-accent/5"
                  >
                    <span className="block pl-3 text-sm font-medium">{label}</span>
                    <span className="hud-mono block pl-3 text-xs text-muted">
                      {node.id.slice(0, 8)}…
                    </span>
                    <Badge status={status} className="ml-3 mt-1" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="overflow-hidden p-0">
          {graph ? (
            <OrchestrationCanvas
              nodes={flowGraph.nodes}
              edges={flowGraph.edges}
              readOnly
              onSelectNode={handleSelectNode}
            />
          ) : (
            <p className="p-4 text-muted">Graph snapshot unavailable.</p>
          )}
        </Card>

        <Card className="hidden flex-col overflow-hidden lg:flex">
          <div className="border-b border-border p-3">
            <CardTitle className="text-xs">
              {selectedChild ? "Node inspector" : "Run inspector"}
            </CardTitle>
            {selectedChild && (
              <div className="mt-2 flex gap-1">
                <Button
                  variant={inspectorTab === "summary" ? "default" : "outline"}
                  className="h-7 flex-1 px-2 text-xs"
                  onClick={() => setInspectorTab("summary")}
                >
                  Summary
                </Button>
                <Button
                  variant={inspectorTab === "events" ? "default" : "outline"}
                  className="h-7 flex-1 px-2 text-xs"
                  onClick={() => setInspectorTab("events")}
                >
                  Events
                </Button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {selectedChild && selectedGraphNode && graph ? (
              inspectorTab === "summary" ? (
                <OrchestrationNodeInspector
                  mode="run"
                  node={selectedGraphNode}
                  graph={graph}
                  agent={selectedAgent}
                  childSummary={selectedChild}
                />
              ) : (
                <ChildTimeline runId={selectedChild.id} status={selectedChild.status} />
              )
            ) : (
              <p className="text-sm text-muted">
                Select a node to inspect its input, reply, and timeline.
              </p>
            )}
          </div>
        </Card>
      </div>

      {selectedChild && selectedGraphNode && graph && (
        <Card className="lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Node inspector</CardTitle>
            <div className="flex gap-1">
              <Button
                variant={inspectorTab === "summary" ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => setInspectorTab("summary")}
              >
                Summary
              </Button>
              <Button
                variant={inspectorTab === "events" ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => setInspectorTab("events")}
              >
                Events
              </Button>
            </div>
          </div>
          <div className="mt-3">
            {inspectorTab === "summary" ? (
              <OrchestrationNodeInspector
                mode="run"
                node={selectedGraphNode}
                graph={graph}
                agent={selectedAgent}
                childSummary={selectedChild}
              />
            ) : (
              <ChildTimeline runId={selectedChild.id} status={selectedChild.status} />
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
