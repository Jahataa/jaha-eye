import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const variants = {
  default:
    "border border-accent/60 bg-accent/10 text-accent hover:bg-accent/20 hover:shadow-[0_0_12px_rgb(125_249_255_/_0.3)]",
  outline:
    "border border-accent/40 bg-transparent text-accent hover:bg-accent/10 hover:border-accent/60",
  danger:
    "border border-danger bg-danger text-white hover:bg-danger/90 hover:shadow-[0_0_12px_rgb(239_68_68_/_0.4)]",
  ghost: "border border-transparent text-muted hover:border-border hover:bg-card hover:text-foreground",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
}

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center px-4 py-2 text-sm font-semibold uppercase tracking-wider transition disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
