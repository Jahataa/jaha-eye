import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const colors: Record<string, string> = {
  running: "bg-accent/20 text-accent",
  completed: "bg-success/20 text-success",
  failed: "bg-danger/20 text-danger",
  cancelled: "bg-muted/20 text-muted",
  queued: "bg-warning/20 text-warning",
  active: "bg-success/20 text-success",
  disabled: "bg-muted/20 text-muted",
};

export function Badge({
  status,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium uppercase",
        colors[status] ?? "bg-card text-foreground",
        className,
      )}
      {...props}
    >
      {status}
    </span>
  );
}
