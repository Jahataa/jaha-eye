import type { BuiltinTool } from "@jaha-eye/shared";
import { cn } from "../../lib/utils";
import { Checkbox } from "../ui/checkbox";

interface ToolCardProps {
  tool: BuiltinTool;
  checked: boolean;
  onToggle: () => void;
}

const RISK_STYLES: Record<BuiltinTool["risk"], string> = {
  safe: "bg-success/20 text-success",
  network: "bg-accent/20 text-accent",
  dangerous: "bg-danger/20 text-danger",
};

const RISK_LABEL: Record<BuiltinTool["risk"], string> = {
  safe: "Safe",
  network: "Live egress",
  dangerous: "Dangerous",
};

export function ToolCard({ tool, checked, onToggle }: ToolCardProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-surface/50">
      <Checkbox checked={checked} onChange={onToggle} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{tool.name}</span>
          <span
            className={cn(
              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
              RISK_STYLES[tool.risk],
            )}
          >
            {RISK_LABEL[tool.risk]}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">{tool.description}</p>
      </div>
    </label>
  );
}
