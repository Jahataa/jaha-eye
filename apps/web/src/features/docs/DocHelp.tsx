import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { FEATURE_DOC_LINKS, type FeatureDocKey } from "./doc-links";
import { useUiStore } from "../../stores/ui-store";
import { cn } from "../../lib/utils";

type DocHelpProps = {
  feature?: FeatureDocKey;
  slug?: string;
  anchor?: string;
  label?: string;
  className?: string;
};

export function DocHelp({ feature, slug, anchor, label, className }: DocHelpProps) {
  const open = useUiStore((s) => s.openDocDrawer);
  const target = feature ? FEATURE_DOC_LINKS[feature] : slug ? { slug, anchor, label: label ?? "Docs" } : null;

  if (!target) {
    return null;
  }

  const tip = label ?? target.label;

  return (
    <button
      type="button"
      title={tip}
      aria-label={`Documentation: ${tip}`}
      className={cn(
        "inline-flex size-7 items-center justify-center border border-border text-muted transition hover:border-accent/50 hover:text-accent",
        className,
      )}
      onClick={() =>
        open({
          slug: target.slug,
          anchor: ("anchor" in target ? target.anchor : undefined) ?? anchor,
        })
      }
    >
      <CircleHelp className="size-4" />
    </button>
  );
}

export function PageTitleRow({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <h1 className="text-xl font-bold uppercase tracking-wider text-foreground">{title}</h1>
      {children}
    </div>
  );
}
