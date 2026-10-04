import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  buildNodeMessage,
  getUpstreamNodeIds,
  resolveEntryNodeMessage,
  resolveNodeSystemPrompt,
  type AgentDefinition,
  type GraphNode,
  type OrchestrationGraph,
  type RunChildSummary,
} from "@jaha-eye/shared";
import { Label } from "../../components/ui/label";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";

const OUTPUT_VARIABLE_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

type OrchestrationNodeInspectorProps = {
  mode: "editor" | "run";
  node: GraphNode;
  graph: OrchestrationGraph;
  agent: AgentDefinition | undefined;
  defaultRunInput?: string;
  outputVariable?: string | null;
  inputTemplate?: string | null;
  systemPrompt?: string | null;
  onOutputVariableChange?: (value: string | null) => void;
  onInputTemplateChange?: (value: string | null) => void;
  onSystemPromptChange?: (value: string | null) => void;
  childSummary?: RunChildSummary;
  timeline?: React.ReactNode;
};

function buildPreviewVariables(
  graph: OrchestrationGraph,
  nodeId: string,
): Record<string, string> {
  const upstreamIds = getUpstreamNodeIds(graph, nodeId);
  const variables: Record<string, string> = {};

  for (const upstreamId of upstreamIds) {
    const upstreamNode = graph.nodes.find((entry) => entry.id === upstreamId);
    if (upstreamNode?.outputVariable) {
      variables[upstreamNode.outputVariable] = `[${upstreamNode.outputVariable}]`;
    }
  }

  return variables;
}

function upstreamVariableHints(graph: OrchestrationGraph, nodeId: string): string[] {
  return getUpstreamNodeIds(graph, nodeId)
    .map((upstreamId) => graph.nodes.find((entry) => entry.id === upstreamId))
    .filter((upstream): upstream is GraphNode => !!upstream?.outputVariable)
    .map((upstream) => upstream.outputVariable!);
}

export function OrchestrationNodeInspector({
  mode,
  node,
  graph,
  agent,
  defaultRunInput = "",
  outputVariable = null,
  inputTemplate = null,
  systemPrompt = null,
  onOutputVariableChange,
  onInputTemplateChange,
  onSystemPromptChange,
  childSummary,
  timeline,
}: OrchestrationNodeInspectorProps) {
  const upstreamHints = useMemo(() => upstreamVariableHints(graph, node.id), [graph, node.id]);
  const isEntryNode = upstreamHints.length === 0;

  const agentSystemPrompt = agent?.systemPrompt?.trim() ?? "";

  const displayedSystemPrompt = systemPrompt?.trim() ? systemPrompt : agentSystemPrompt;
  const displayedInputTemplate = inputTemplate ?? "";

  const inheritedEntryMessage = useMemo(() => {
    if (!agent || !isEntryNode) return "";
    return resolveEntryNodeMessage(defaultRunInput, agent.defaultRunInput);
  }, [agent, isEntryNode, defaultRunInput]);

  const effectiveMessagePreview = useMemo(() => {
    if (mode !== "editor" || !agent) return null;

    const previewNode: GraphNode = {
      ...node,
      outputVariable: outputVariable ?? null,
      inputTemplate: inputTemplate ?? null,
    };

    try {
      return buildNodeMessage(previewNode, graph, {
        orchestrationInput: defaultRunInput,
        agentDefaultRunInput: agent.defaultRunInput,
        variables: buildPreviewVariables(graph, node.id),
        nodeOutputs: new Map(),
      });
    } catch {
      return null;
    }
  }, [mode, agent, node, graph, defaultRunInput, outputVariable, inputTemplate]);

  const outputVariableError =
    mode === "editor" &&
    outputVariable &&
    !OUTPUT_VARIABLE_PATTERN.test(outputVariable)
      ? "Use letters, numbers, and underscores; must start with a letter or underscore."
      : null;

  return (
    <div className="space-y-3">
      <div>
        <p className="hud-kicker mb-1">Agent</p>
        {agent ? (
          <>
            <p className="font-semibold text-sm">{agent.name}</p>
            <p className="hud-mono text-xs text-muted">{agent.slug}</p>
            <Link
              to={`/agents/${agent.id}`}
              className="hud-mono mt-1 inline-block text-xs text-accent hover:underline"
            >
              Edit agent
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted">Agent not found.</p>
        )}
      </div>

      <div>
        <Label>System prompt (this orchestration only)</Label>
        {mode === "editor" ? (
          <>
            <Textarea
              value={displayedSystemPrompt}
              onChange={(e) => {
                const value = e.target.value;
                if (!value.trim() || value.trim() === agentSystemPrompt) {
                  onSystemPromptChange?.(null);
                } else {
                  onSystemPromptChange?.(value);
                }
              }}
              placeholder="You are a helpful assistant."
              className="mt-1 min-h-[96px] text-xs"
            />
            <p className="mt-1 text-xs text-muted">
              {systemPrompt?.trim()
                ? "Overrides the agent's saved instructions for this node only."
                : "Pre-filled from the agent. Edit only if this step needs different instructions than the agent default."}
            </p>
          </>
        ) : (
          <Textarea
            value={
              agent
                ? resolveNodeSystemPrompt(node, agent.systemPrompt)
                : (node.systemPrompt?.trim() ?? "")
            }
            readOnly
            className="mt-1 min-h-[96px] text-xs"
          />
        )}
      </div>

      <div>
        <Label>Output variable</Label>
        {mode === "editor" ? (
          <>
            <Input
              value={outputVariable ?? ""}
              onChange={(e) => {
                const value = e.target.value.trim();
                onOutputVariableChange?.(value || null);
              }}
              placeholder="e.g. City"
              className="mt-1"
            />
            {outputVariableError && (
              <p className="mt-1 text-xs text-danger">{outputVariableError}</p>
            )}
            <p className="mt-1 text-xs text-muted">
              Optional. Name this node&apos;s reply so downstream nodes can reference it as{" "}
              {"${VarName}"} in their input template (e.g. set <span className="hud-mono">City</span>{" "}
              to use <span className="hud-mono">${"{City}"}</span> later).
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm">
            {childSummary?.outputVariables
              ? Object.entries(childSummary.outputVariables)
                  .map(([name, value]) => `${name} = ${value}`)
                  .join(", ")
              : node.outputVariable
                ? `${node.outputVariable} (not set this run)`
                : "—"}
          </p>
        )}
      </div>

      {mode === "editor" && isEntryNode && (
        <div>
          <Label>User message</Label>
          <Textarea
            value={inputTemplate ?? inheritedEntryMessage}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || value === inheritedEntryMessage) {
                onInputTemplateChange?.(null);
              } else {
                onInputTemplateChange?.(value);
              }
            }}
            className="mt-1 min-h-[72px] text-xs"
          />
          <p className="mt-1 text-xs text-muted">
            The question or task sent to this agent on Run. Pre-filled from orchestration default,
            then the agent&apos;s default run input. Edit to override for this node only.
          </p>
        </div>
      )}

      {mode === "editor" && !isEntryNode && (
        <>
          <div>
            <Label>Input template</Label>
            <Textarea
              value={displayedInputTemplate}
              onChange={(e) => {
                const value = e.target.value;
                onInputTemplateChange?.(value === "" ? null : value);
              }}
              placeholder="e.g. What time is currently in ${City}?"
              className="mt-1 min-h-[72px] text-xs"
            />
            {upstreamHints.length > 0 ? (
              <p className="mt-1 text-xs text-muted">
                The user message for this step. Use upstream variables:{" "}
                {upstreamHints.map((name) => `\${${name}}`).join(", ")}. Leave empty to pass
                upstream replies as-is.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">
                The user message for this step. Use {"${VarName}"} after upstream nodes define
                output variables.
              </p>
            )}
          </div>
          <div>
            <Label>Effective message preview</Label>
            <Textarea
              value={
                effectiveMessagePreview ?? "Preview unavailable — check template variables."
              }
              readOnly
              className="mt-1 min-h-[72px] text-xs"
            />
            <p className="mt-1 text-xs text-muted">
              Read-only preview after {"${variable}"} substitution.
            </p>
          </div>
        </>
      )}

      {mode === "run" && !isEntryNode && (
        <div>
          <Label>Input template</Label>
          <p className="mt-1 whitespace-pre-wrap text-sm">
            {node.inputTemplate?.trim() || "—"}
          </p>
        </div>
      )}

      {mode === "run" && (
        <div>
          <Label>Consumed input</Label>
          <Textarea
            value={childSummary?.inputMessage ?? "—"}
            readOnly
            className="mt-1 min-h-[72px] text-xs"
          />
        </div>
      )}

      {mode === "run" && (
        <div>
          <Label>Assistant reply</Label>
          <Textarea
            value={childSummary?.outputReply ?? "—"}
            readOnly
            className="mt-1 min-h-[72px] text-xs"
          />
        </div>
      )}

      {mode === "run" && timeline && (
        <div className="border-t border-border pt-3">{timeline}</div>
      )}
    </div>
  );
}
