import { useEffect, useState } from "react";
import type { DocHeading } from "./docs-parse";
import { cn } from "../../lib/utils";

type DocsTocProps = {
  headings: DocHeading[];
  containerId: string;
};

export function DocsToc({ headings, containerId }: DocsTocProps) {
  const [active, setActive] = useState<string | null>(headings[0]?.slug ?? null);

  useEffect(() => {
    const root = document.getElementById(containerId);
    if (!root || headings.length === 0) {
      return;
    }
    const elements = headings
      .map((h) => root.querySelector(`#${CSS.escape(h.slug)}`))
      .filter((el): el is HTMLElement => el instanceof HTMLElement);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target.id;
        if (top) {
          setActive(top);
        }
      },
      { root: null, rootMargin: "-20% 0px -70% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    for (const el of elements) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [containerId, headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav className="sticky top-4 text-xs" aria-label="On this page">
      <div className="mb-3 hud-kicker">On this page</div>
      <ul className="flex flex-col gap-1 border-l border-border">
        {headings.map((h) => (
          <li key={h.slug}>
            <a
              href={`#${h.slug}`}
              className={cn(
                "block border-l-2 py-1 pl-3 transition",
                h.level === 3 && "pl-5",
                active === h.slug
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
