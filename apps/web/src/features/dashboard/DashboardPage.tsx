import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { Card, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

function isToday(date: Date | string | null) {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function InstrumentRing() {
  return (
    <svg
      className="pointer-events-none absolute right-4 top-1/2 h-20 w-20 -translate-y-1/2 opacity-30"
      viewBox="0 0 80 80"
      fill="none"
    >
      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="1" className="text-accent/40" />
      <circle
        cx="40"
        cy="40"
        r="28"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="4 4"
        className="text-accent/60"
      />
    </svg>
  );
}

function StatInstrument({
  label,
  value,
  unit,
  showRing = false,
}: {
  label: string;
  value: number;
  unit: string;
  showRing?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      {showRing && <InstrumentRing />}
      <p className="hud-kicker">{label}</p>
      <p className="hud-figure mt-2 text-4xl font-bold text-accent">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted">{unit}</p>
    </Card>
  );
}

export function DashboardPage() {
  const { data: runs = [] } = useQuery({ queryKey: ["runs"], queryFn: api.getRuns });
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: api.getAgents });

  const running = runs.filter((r) => r.status === "running").length;
  const completedToday = runs.filter((r) => r.status === "completed" && isToday(r.completedAt)).length;
  const failedToday = runs.filter((r) => r.status === "failed" && isToday(r.completedAt)).length;
  const activeRuns = runs.filter((r) => r.status === "running" || r.status === "queued");

  return (
    <div className="space-y-6">
      <h1 className="hud-kicker text-base text-foreground">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <StatInstrument label="Running" value={running} unit="Active" showRing />
        <StatInstrument label="Completed today" value={completedToday} unit="Today" />
        <StatInstrument label="Failed today" value={failedToday} unit="Today" />
      </div>

      <Card>
        <CardTitle>Active runs</CardTitle>
        {activeRuns.length === 0 ? (
          <p className="mt-4 text-muted">No active runs.</p>
        ) : (
          <ul className="mt-4 space-y-1">
            {activeRuns.map((run) => {
              const agent = agents.find((a) => a.id === run.agentId);
              const isRunning = run.status === "running";
              return (
                <li
                  key={run.id}
                  className="flex items-center gap-3 border-b border-border/50 py-3 last:border-b-0"
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_8px_rgb(125_249_255_/_0.8)]",
                      isRunning && "hud-pulse",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <Link to={`/runs/${run.id}`} className="font-semibold hover:text-accent">
                      {agent?.name ?? run.agentId}
                    </Link>
                    <p className="hud-mono text-xs text-muted">RUN {run.id.slice(0, 8)}</p>
                  </div>
                  <Badge status={run.status} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
