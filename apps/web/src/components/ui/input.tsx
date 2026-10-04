import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "hud-mono w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent/60 focus:shadow-[0_0_8px_rgb(125_249_255_/_0.2)]",
        className,
      )}
      {...props}
    />
  );
}
