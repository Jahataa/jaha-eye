import { NavLink, Outlet } from "react-router-dom";
import { cn } from "../../lib/utils";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/agents", label: "Agents" },
  { to: "/runs", label: "Runs" },
];

export function AppShell() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-border bg-card p-4">
        <div className="mb-8 text-xl font-bold">jaha-eye</div>
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm transition",
                  isActive ? "bg-accent/20 text-accent" : "text-muted hover:bg-background",
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
  );
}
