import { NavLink } from "react-router-dom";
import { DOC_SECTIONS, type DocPage } from "./docs-parse";
import { docHref } from "./resolve-doc-link";
import { cn } from "../../lib/utils";

type DocsSidebarProps = {
  pages: DocPage[];
  activeSlug: string;
};

export function DocsSidebar({ pages, activeSlug }: DocsSidebarProps) {
  const bySection = DOC_SECTIONS.map((section) => ({
    ...section,
    pages: pages.filter((p) => p.section === section.id),
  })).filter((s) => s.pages.length > 0);

  return (
    <nav className="flex flex-col gap-6 text-xs" aria-label="Documentation">
      {bySection.map((section) => (
        <div key={section.id}>
          <div className="mb-2 hud-kicker">{section.label}</div>
          <ul className="flex flex-col gap-0.5">
            {section.pages.map((page) => {
              const to = docHref(page.slug);
              return (
                <li key={page.slug}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        "block border-l-2 px-2 py-1.5 font-semibold uppercase tracking-wider transition",
                        isActive || page.slug === activeSlug
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-transparent text-muted hover:border-accent/30 hover:text-foreground",
                      )
                    }
                  >
                    {page.title}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
