import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "../../components/ui/button";
import { DOC_PAGES, getAdjacentDocs, getDocPage } from "./docs-registry";
import { DocsSidebar } from "./DocsSidebar";
import { DocsToc } from "./DocsToc";
import { MarkdownView } from "./MarkdownView";
import { docHref } from "./resolve-doc-link";
import { useUiStore } from "../../stores/ui-store";

const ARTICLE_ID = "docs-article";

export function DocsPage() {
  const { "*": splat } = useParams();
  const location = useLocation();
  const setSearchOpen = useUiStore((s) => s.setDocsSearchOpen);
  const slug = splat?.replace(/^\/+|\/+$/g, "") || "README";
  const page = getDocPage(slug);
  const { prev, next } = getAdjacentDocs(slug);

  useEffect(() => {
    const hash = location.hash.replace(/^#/, "");
    if (!hash) {
      return;
    }
    const el = document.getElementById(hash);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash, slug]);

  if (!page) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold uppercase tracking-wider text-accent">Page not found</h1>
        <p className="text-sm text-muted">No documentation for &quot;{slug}&quot;.</p>
        <Link to="/docs" className="text-sm text-accent underline">
          Back to docs home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="hud-kicker">Documentation</div>
          <h1 className="text-xl font-bold uppercase tracking-wider text-foreground">{page.title}</h1>
        </div>
        <Button type="button" variant="outline" className="gap-2" onClick={() => setSearchOpen(true)}>
          <Search className="size-4" />
          Search
          <span className="hud-mono hidden text-[10px] text-muted sm:inline">⌘K</span>
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 gap-6">
        <aside className="hidden w-52 shrink-0 overflow-y-auto lg:block">
          <DocsSidebar pages={DOC_PAGES} activeSlug={page.slug} />
        </aside>
        <div id={ARTICLE_ID} className="min-w-0 flex-1 overflow-y-auto pr-2">
          <MarkdownView body={page.body} currentSlug={page.slug} />
          <div className="mt-10 flex flex-wrap justify-between gap-4 border-t border-border pt-6 text-xs uppercase tracking-wider">
            {prev ? (
              <Link
                to={docHref(prev.slug)}
                className="inline-flex items-center gap-1 text-muted hover:text-accent"
              >
                <ChevronLeft className="size-4" />
                {prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                to={docHref(next.slug)}
                className="inline-flex items-center gap-1 text-muted hover:text-accent"
              >
                {next.title}
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span />
            )}
          </div>
        </div>
        <aside className="hidden w-44 shrink-0 xl:block">
          <DocsToc headings={page.headings} containerId={ARTICLE_ID} />
        </aside>
      </div>
    </div>
  );
}
