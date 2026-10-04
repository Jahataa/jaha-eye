import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

function CornerBrackets() {
  return (
    <>
      <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-accent/60" />
      <span className="pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t border-accent/60" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b border-l border-accent/60" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-accent/60" />
    </>
  );
}

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative border border-border bg-card p-4 shadow-[inset_0_0_24px_rgb(125_249_255_/_0.04)]",
        className,
      )}
      {...props}
    >
      <CornerBrackets />
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("hud-kicker text-sm", className)} {...props}>
      {children}
    </h3>
  );
}
