import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { searchDocs, type DocSearchResult } from "./docs-search";
import { docSearchIndex } from "./doc-search-index";
import { docHref } from "./resolve-doc-link";
import { cn } from "../../lib/utils";
import { useUiStore } from "../../stores/ui-store";

export function DocsSearchDialog() {
  const open = useUiStore((s) => s.docsSearchOpen);
  const setOpen = useUiStore((s) => s.setDocsSearchOpen);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocSearchResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIdx(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setResults(searchDocs(docSearchIndex, query));
    setActiveIdx(0);
  }, [query]);

  const go = (hit: DocSearchResult) => {
    const href = docHref(hit.slug, hit.anchor);
    setOpen(false);
    navigate(href);
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && results[activeIdx]) {
        e.preventDefault();
        go(results[activeIdx]!);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, activeIdx, setOpen]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 p-4 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Search documentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          setOpen(false);
        }
      }}
    >
      <div className="w-full max-w-xl border border-border bg-card shadow-[0_0_24px_rgb(125_249_255_/_0.12)]">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="size-4 text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs…"
            className="hud-mono flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
          />
          <kbd className="hud-mono hidden text-[10px] text-muted sm:inline">ESC</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          {query && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-muted">No matches.</li>
          )}
          {results.map((hit, idx) => (
            <li key={hit.id}>
              <button
                type="button"
                className={cn(
                  "w-full px-4 py-2 text-left transition",
                  idx === activeIdx ? "bg-accent/10 text-accent" : "hover:bg-background",
                )}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => go(hit)}
              >
                <div className="text-xs font-semibold uppercase tracking-wider">
                  {hit.sectionTitle ? `${hit.title} › ${hit.sectionTitle}` : hit.title}
                </div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted">{hit.snippet}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function useDocsSearchShortcut() {
  const setOpen = useUiStore((s) => s.setDocsSearchOpen);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);
}
