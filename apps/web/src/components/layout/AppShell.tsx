import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { api } from "../../lib/api";
import { ScheduleTicker } from "../../features/schedules/ScheduleTicker";
import { DocsDrawer } from "../../features/docs/DocsDrawer";
import { DocsSearchDialog, useDocsSearchShortcut } from "../../features/docs/DocsSearch";
import { useUiStore } from "../../stores/ui-store";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/agents", label: "Agents" },
  { to: "/orchestrations", label: "Orchestrations" },
  { to: "/schedules", label: "Schedules" },
  { to: "/runs", label: "Runs" },
  { to: "/graphify", label: "Graphify" },
  { to: "/settings", label: "Settings" },
];

const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function HudTopBar() {
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString());
  const { data: runs = [] } = useQuery({ queryKey: ["runs"], queryFn: api.getRuns });
  const activity = useUiStore((s) => s.activity);
  const setDocsSearchOpen = useUiStore((s) => s.setDocsSearchOpen);

  const activeCount = runs.filter((r) => r.status === "running" || r.status === "queued").length;

  useEffect(() => {
    const id = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 text-xs uppercase tracking-wider">
      <div className="flex items-center gap-6">
        <span className="hud-mono text-muted">{clock}</span>
        <span className="hud-mono text-muted">{localTimeZone}</span>
        <span className="text-muted">
          Active runs: <span className="hud-figure text-accent">{activeCount}</span>
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-3">
        {activity && (
          <span className="hud-mono max-w-[40vw] truncate text-accent/90">
            <span className="text-muted">SYS // </span>
            {activity}
          </span>
        )}
        <Link
          to="/docs"
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1.5 border border-accent/40 px-2 py-0 text-[10px] font-semibold uppercase tracking-wider text-accent transition hover:bg-accent/10",
          )}
        >
          <BookOpen className="size-3.5" />
          Docs
        </Link>
        <Button
          type="button"
          variant="ghost"
          className="hidden h-7 shrink-0 px-2 py-0 text-[10px] sm:inline-flex"
          onClick={() => setDocsSearchOpen(true)}
        >
          ⌘K
        </Button>
      </div>
    </header>
  );
}

export function AppShell() {
  useDocsSearchShortcut();

  return (
    <div className="flex min-h-screen flex-col">
      <ScheduleTicker />
      <HudTopBar />
      <DocsSearchDialog />
      <DocsDrawer />
      <div className="flex flex-1">
        <aside className="w-56 shrink-0 border-r border-border bg-card/60 p-4">
          <div className="mb-8 hud-callsign-pulse text-sm font-bold uppercase tracking-[0.2em] text-accent">
            JAHA-EYE // ONLINE
          </div>
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-2 text-xs font-semibold uppercase tracking-wider transition",
                    isActive
                      ? "border-l-2 border-accent bg-accent/10 text-accent"
                      : "border-l-2 border-transparent text-muted hover:border-accent/30 hover:bg-background hover:text-foreground",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
