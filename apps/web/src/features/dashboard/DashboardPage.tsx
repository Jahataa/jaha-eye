import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Card, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

function isToday(date: Date | string | null) {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
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
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardTitle className="text-muted text-sm">Running</CardTitle>
          <p className="mt-2 text-3xl font-bold">{running}</p>
        </Card>
        <Card>
          <CardTitle className="text-muted text-sm">Completed today</CardTitle>
          <p className="mt-2 text-3xl font-bold">{completedToday}</p>
        </Card>
        <Card>
          <CardTitle className="text-muted text-sm">Failed today</CardTitle>
          <p className="mt-2 text-3xl font-bold">{failedToday}</p>
        </Card>
      </div>

      <Card>
        <CardTitle>Active runs</CardTitle>
        {activeRuns.length === 0 ? (
          <p className="mt-4 text-muted">No active runs.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {activeRuns.map((run) => {
              const agent = agents.find((a) => a.id === run.agentId);
              return (
                <li key={run.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <Link to={`/runs/${run.id}`} className="font-medium hover:text-accent">
                      {agent?.name ?? run.agentId}
                    </Link>
                    <p className="text-sm text-muted">Run {run.id.slice(0, 8)}…</p>
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
