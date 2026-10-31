import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { getDocPage } from "./docs-registry";
import { MarkdownView } from "./MarkdownView";
import { docHref } from "./resolve-doc-link";
import { useUiStore } from "../../stores/ui-store";

const DRAWER_ARTICLE_ID = "docs-drawer-article";

export function DocsDrawer() {
  const drawer = useUiStore((s) => s.docsDrawer);
  const close = useUiStore((s) => s.closeDocDrawer);
  const panelRef = useRef<HTMLElement>(null);
  const navigate = useNavigate();
  const page = drawer ? getDocPage(drawer.slug) : undefined;

  useEffect(() => {
    if (!drawer) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer, close]);

  useEffect(() => {
    if (!drawer?.anchor || !page) {
      return;
    }
    const t = window.setTimeout(() => {
      document.getElementById(drawer.anchor!)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(t);
  }, [drawer?.anchor, drawer?.slug, page]);

  if (!drawer || !page) {
    return null;
  }

  const fullHref = docHref(drawer.slug, drawer.anchor);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-background/60 backdrop-blur-[2px]">
      <button
        type="button"
        className="flex-1 cursor-default"
        aria-label="Close documentation"
        onClick={close}
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-[0_0_32px_rgb(125_249_255_/_0.08)] outline-none"
        aria-label="Documentation preview"
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <div className="hud-kicker">Docs</div>
            <h2 className="truncate text-sm font-bold uppercase tracking-wider text-foreground">
              {page.title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to={fullHref}
              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-accent hover:underline"
              onClick={close}
            >
              <BookOpen className="size-3.5" />
              Full page
            </Link>
            <Button type="button" variant="ghost" className="px-2 py-1" onClick={close} aria-label="Close">
              <X className="size-4" />
            </Button>
          </div>
        </header>
        <div id={DRAWER_ARTICLE_ID} className="flex-1 overflow-y-auto p-4">
          <MarkdownView
            body={page.body}
            currentSlug={page.slug}
            onInternalNavigate={(to, hash) => {
              close();
              navigate(hash ? `${to}#${hash}` : to);
            }}
          />
        </div>
      </aside>
    </div>
  );
}
