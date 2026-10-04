import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const colors: Record<string, string> = {
  running: "border border-accent/50 bg-accent/15 text-accent hud-pulse",
  completed: "border border-success/40 bg-success/10 text-success",
  failed: "border border-danger/40 bg-danger/10 text-danger",
  cancelled: "border border-muted/30 bg-muted/10 text-muted",
  queued: "border border-warning/40 bg-warning/10 text-warning",
  active: "border border-success/40 bg-success/10 text-success",
  disabled: "border border-muted/30 bg-muted/10 text-muted",
};

export function Badge({
  status,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex px-2 py-0.5 text-xs font-semibold uppercase tracking-wider",
        colors[status] ?? "border border-border bg-card text-foreground",
        className,
      )}
      {...props}
    >
      {status}
    </span>
  );
}
