import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useUiStore } from "../../stores/ui-store";
import { cn } from "../../lib/utils";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/agents", label: "Agents" },
  { to: "/runs", label: "Runs" },
];

function HudTopBar() {
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString());
  const { data: runs = [] } = useQuery({ queryKey: ["runs"], queryFn: api.getRuns });
  const activity = useUiStore((s) => s.activity);

  const activeCount = runs.filter((r) => r.status === "running" || r.status === "queued").length;

  useEffect(() => {
    const id = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex h-10 shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 text-xs uppercase tracking-wider">
      <div className="flex items-center gap-6">
        <span className="hud-mono text-muted">{clock}</span>
        <span className="text-muted">
          Active runs: <span className="hud-figure text-accent">{activeCount}</span>
        </span>
      </div>
      {activity && (
        <span className="hud-mono truncate text-accent/90">
          <span className="text-muted">SYS // </span>
          {activity}
        </span>
      )}
    </header>
  );
}

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <HudTopBar />
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
