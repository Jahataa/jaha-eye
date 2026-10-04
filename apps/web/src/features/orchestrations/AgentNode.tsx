import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import type { AgentNodeData } from "./graph-utils";

const statusBorder: Record<string, string> = {
  running: "border-accent/70 shadow-[0_0_12px_rgb(125_249_255_/_0.35)] hud-pulse",
  completed: "border-success/60",
  failed: "border-danger/60",
  cancelled: "border-muted/40",
  queued: "border-warning/50",
  waiting: "border-warning/40",
};

export function AgentNode({ data, selected }: NodeProps) {
  const nodeData = data as AgentNodeData;
  const statusClass = nodeData.status ? statusBorder[nodeData.status] : "border-border";
  const showControls = nodeData.editable && !nodeData.status;

  return (
    <div
      className={cn(
        "agent-node group relative min-w-[160px] border bg-card px-3 py-2 text-sm transition",
        statusClass,
        (selected || nodeData.inspectorSelected) && "ring-1 ring-accent/60",
      )}
    >
      {showControls && (
        <div
          className={cn(
            "nodrag nopan absolute -right-1 -top-7 flex gap-1 transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <Button
            type="button"
            variant="outline"
            className="h-6 px-2 py-0 text-[10px]"
            onClick={(event) => {
              event.stopPropagation();
              nodeData.onSwap?.();
            }}
          >
            Swap
          </Button>
          <Button
            type="button"
            variant="danger"
            className="h-6 px-2 py-0 text-[10px]"
            onClick={(event) => {
              event.stopPropagation();
              nodeData.onDelete?.();
            }}
          >
            Del
          </Button>
        </div>
      )}

      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-accent/60 !bg-background"
      />
      <p className="font-semibold text-foreground">{nodeData.agentName}</p>
      <p className="hud-mono text-xs text-muted">{nodeData.agentSlug}</p>
      {nodeData.status && (
        <p className="hud-kicker mt-1 text-[10px]">{nodeData.status}</p>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-accent/60 !bg-background"
      />

      {nodeData.isEditing && nodeData.agentOptions && nodeData.agentOptions.length > 0 && (
        <div
          className="nodrag nopan absolute left-0 top-full z-20 mt-1 max-h-48 w-[200px] overflow-y-auto border border-accent/40 bg-card shadow-[0_0_16px_rgb(125_249_255_/_0.15)]"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="hud-kicker border-b border-border px-2 py-1.5 text-[10px]">
            Swap agent
          </p>
          {nodeData.agentOptions.map((agent) => (
            <button
              key={agent.id}
              type="button"
              disabled={agent.id === nodeData.agentId}
              onClick={() => nodeData.onAgentChange?.(agent.id)}
              className={cn(
                "w-full border-b border-border/50 px-2 py-2 text-left text-xs transition last:border-b-0",
                agent.id === nodeData.agentId
                  ? "cursor-default bg-accent/10 text-accent"
                  : "hover:border-accent/30 hover:bg-accent/5",
              )}
            >
              <span className="block font-semibold">{agent.name}</span>
              <span className="hud-mono block text-[10px] text-muted">{agent.slug}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
