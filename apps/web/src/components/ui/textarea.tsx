import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "hud-mono min-h-24 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent/60 focus:shadow-[0_0_8px_rgb(125_249_255_/_0.2)]",
        className,
      )}
      {...props}
    />
  );
}
