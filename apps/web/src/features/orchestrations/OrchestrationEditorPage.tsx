import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  applyNodeChanges,
  applyEdgeChanges,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import { resolveDefaultOrchestrationInput, type OrchestrationGraph } from "@jaha-eye/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Card } from "../../components/ui/card";
import { OrchestrationCanvas, connectEdge } from "./OrchestrationCanvas";
import { OrchestrationNodeInspector } from "./OrchestrationNodeInspector";
import { flowToGraph, graphToFlow, newNodeId, type AgentNodeData } from "./graph-utils";
import { ScheduleSection } from "../schedules/ScheduleSection";

const BLANK_DEFAULTS = {
  name: "",
  slug: "",
  description: "",
  defaultRunInput: "",
};

export function OrchestrationEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: orchestration } = useQuery({
    queryKey: ["orchestrations", id],
    queryFn: () => api.getOrchestration(id!),
    enabled: !isNew,
  });

  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: api.getAgents });

  const agentLookup = useMemo(
    () => new Map(agents.map((a) => [a.id, { name: a.name, slug: a.slug }])),
    [agents],
  );

  const [name, setName] = useState(BLANK_DEFAULTS.name);
  const [slug, setSlug] = useState(BLANK_DEFAULTS.slug);
  const [description, setDescription] = useState(BLANK_DEFAULTS.description);
  const [defaultRunInput, setDefaultRunInput] = useState(BLANK_DEFAULTS.defaultRunInput);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const [nodes, setNodes] = useNodesState<Node<AgentNodeData>>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  const onNodesChange = useCallback(
    (changes: Parameters<typeof applyNodeChanges>[0]) => {
      setNodes((nds) => applyNodeChanges(changes, nds) as Node<AgentNodeData>[]);
    },
    [setNodes],
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof applyEdgeChanges>[0]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges],
  );

  useEffect(() => {
    if (orchestration) {
      setName(orchestration.name);
      setSlug(orchestration.slug);
      setDescription(orchestration.description ?? "");
      setDefaultRunInput(orchestration.defaultRunInput ?? "");
      const flow = graphToFlow(orchestration.graph, agentLookup);
      setNodes(flow.nodes);
      setEdges(flow.edges);
    }
  }, [orchestration, agentLookup, setNodes, setEdges]);

  const getGraph = useCallback((): OrchestrationGraph => flowToGraph(nodes, edges), [nodes, edges]);

  const addAgentAt = useCallback(
    (agentId: string, position: { x: number; y: number }) => {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent) return;
      const nodeId = newNodeId();
      const newNode: Node<AgentNodeData> = {
        id: nodeId,
        type: "agentNode",
        position,
        data: { agentId: agent.id, agentName: agent.name, agentSlug: agent.slug },
        selected: true,
      };
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
      setSelectedNodeId(nodeId);
    },
    [agents, setNodes],
  );

  const handlePaletteClick = (agentId: string) => {
    addAgentAt(agentId, { x: 120 + nodes.length * 40, y: 80 + nodes.length * 30 });
  };

  const handleCanvasDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const agentId = event.dataTransfer.getData("application/jaha-agent-id");
    if (!agentId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    addAgentAt(agentId, {
      x: event.clientX - bounds.left - 80,
      y: event.clientY - bounds.top - 40,
    });
  };

  const removeNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNodeId((current) => (current === nodeId ? null : current));
      setEditingNodeId((current) => (current === nodeId ? null : current));
    },
    [setNodes, setEdges],
  );

  const swapNodeAgent = useCallback(
    (nodeId: string, agentId: string) => {
      const agent = agents.find((a) => a.id === agentId);
      if (!agent) return;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  agentId: agent.id,
                  agentName: agent.name,
                  agentSlug: agent.slug,
                },
              }
            : n,
        ),
      );
      setEditingNodeId(null);
    },
    [agents, setNodes],
  );

  const handleSelectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    setEditingNodeId(null);
  }, []);

  const handleSwapNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setEditingNodeId((current) => (current === nodeId ? null : nodeId));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" || !selectedNodeId) return;
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      event.preventDefault();
      removeNode(selectedNodeId);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, removeNode]);

  const saveMutation = useMutation({
    onMutate: () => setSaveFeedback(null),
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required.");
      if (isNew && !slug.trim()) throw new Error("Slug is required.");
      if (isNew && !/^[a-z0-9-]+$/.test(slug)) {
        throw new Error("Slug must use lowercase letters, numbers, and hyphens only.");
      }

      const graph = getGraph();
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        description: description || undefined,
        graph,
        defaultRunInput: defaultRunInput || null,
      };

      if (isNew) return api.createOrchestration(payload);
      return api.updateOrchestration(id!, payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["orchestrations"] });
      queryClient.invalidateQueries({ queryKey: ["orchestrations", saved.id] });
      if (isNew) {
        navigate(`/orchestrations/${saved.id}`);
      } else {
        setSaveFeedback("Orchestration saved.");
      }
    },
    onError: (error) => {
      setSaveFeedback(error instanceof Error ? error.message : "Save failed.");
    },
  });

  useEffect(() => {
    if (!saveFeedback) return;
    const timer = setTimeout(() => setSaveFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [saveFeedback]);

  const runMutation = useMutation({
    mutationFn: async () => {
      let orchId = id;
      if (isNew) {
        const saved = await saveMutation.mutateAsync();
        orchId = saved.id;
      }
      const input = resolveDefaultOrchestrationInput({ defaultRunInput });
      return api.startOrchestrationRun(orchId!, input);
    },
    onSuccess: (data) => navigate(`/runs/${data.runId}`),
  });

  const handleConnect = (connection: Connection) => {
    setEdges((eds) => connectEdge(eds, connection));
  };

  const activeAgents = agents.filter((a) => a.status === "active");

  const agentOptions = useMemo(
    () => activeAgents.map((a) => ({ id: a.id, name: a.name, slug: a.slug })),
    [activeAgents],
  );

  const canvasNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          editable: true,
          isEditing: node.id === editingNodeId,
          agentOptions: node.id === editingNodeId ? agentOptions : undefined,
          onSwap: () => handleSwapNode(node.id),
          onDelete: () => removeNode(node.id),
          onAgentChange: (agentId: string) => swapNodeAgent(node.id, agentId),
        },
      })),
    [
      nodes,
      editingNodeId,
      agentOptions,
      handleSwapNode,
      removeNode,
      swapNodeAgent,
    ],
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedGraphNode = selectedNodeId
    ? getGraph().nodes.find((node) => node.id === selectedNodeId)
    : undefined;
  const selectedAgent = selectedNode
    ? agents.find((agent) => agent.id === selectedNode.data.agentId)
    : undefined;

  const updateSelectedNodeField = useCallback(
    (field: "outputVariable" | "inputTemplate" | "systemPrompt", value: string | null) => {
      if (!selectedNodeId) return;
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNodeId
            ? { ...node, data: { ...node.data, [field]: value } }
            : node,
        ),
      );
    },
    [selectedNodeId, setNodes],
  );

  return (
    <div className="flex h-[calc(100vh-6.5rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="hud-kicker text-base text-foreground">
          {isNew ? "New orchestration" : "Edit orchestration"}
        </h1>
        <div className="flex gap-2">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (!isNew && !orchestration)}
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
          <Button
            variant="outline"
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending || (!isNew && !orchestration)}
          >
            Run
          </Button>
        </div>
      </div>

      {(saveFeedback || runMutation.isError) && (
        <div>
          {saveFeedback && (
            <p
              className={
                saveFeedback === "Orchestration saved."
                  ? "hud-mono text-sm text-success"
                  : "text-sm text-danger"
              }
            >
              {saveFeedback}
            </p>
          )}
          {runMutation.isError && (
            <p className="text-sm text-danger">
              {runMutation.error instanceof Error ? runMutation.error.message : "Run failed."}
            </p>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-4">
        <Card className="flex w-52 shrink-0 flex-col gap-2 overflow-y-auto p-3">
          <p className="hud-kicker">Agents</p>
          {activeAgents.length === 0 ? (
            <p className="text-xs text-muted">No active agents.</p>
          ) : (
            activeAgents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                draggable
                onDragStart={(e) => e.dataTransfer.setData("application/jaha-agent-id", agent.id)}
                onClick={() => handlePaletteClick(agent.id)}
                className="border border-border bg-background/60 px-2 py-2 text-left text-sm transition hover:border-accent/40 hover:bg-accent/5"
              >
                <span className="font-semibold">{agent.name}</span>
                <span className="hud-mono block text-xs text-muted">{agent.slug}</span>
              </button>
            ))
          )}
        </Card>

        <div
          className="min-h-0 flex-1"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasDrop}
        >
          <OrchestrationCanvas
            nodes={canvasNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onSelectNode={handleSelectNode}
          />
        </div>

        <Card className="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto p-4">
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={!isNew} />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Default run input</Label>
            <Textarea
              value={defaultRunInput}
              onChange={(e) => setDefaultRunInput(e.target.value)}
              placeholder="Message used when you click Run"
            />
          </div>
          {selectedNode && selectedGraphNode && (
            <div className="border-t border-border pt-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="hud-kicker">Node inspector</p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleSwapNode(selectedNode.id)}
                  >
                    Swap agent
                  </Button>
                  <Button
                    variant="danger"
                    className="h-7 px-2 text-xs"
                    onClick={() => removeNode(selectedNode.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              {editingNodeId === selectedNode.id && (
                <p className="hud-mono mb-2 text-[10px] text-muted">
                  Choose an agent on the canvas or press Delete to remove.
                </p>
              )}
              <OrchestrationNodeInspector
                mode="editor"
                node={selectedGraphNode}
                graph={getGraph()}
                agent={selectedAgent}
                defaultRunInput={defaultRunInput}
                outputVariable={selectedNode.data.outputVariable ?? null}
                inputTemplate={selectedNode.data.inputTemplate ?? null}
                systemPrompt={selectedNode.data.systemPrompt ?? null}
                onOutputVariableChange={(value) => updateSelectedNodeField("outputVariable", value)}
                onInputTemplateChange={(value) => updateSelectedNodeField("inputTemplate", value)}
                onSystemPromptChange={(value) => updateSelectedNodeField("systemPrompt", value)}
              />
            </div>
          )}
        </Card>
      </div>

      {!isNew && id && (
        <ScheduleSection fixedTarget={{ targetType: "orchestration", orchestrationId: id }} />
      )}
    </div>
  );
}
