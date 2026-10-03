import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export function RunsPage() {
  const { data: runs = [], isLoading } = useQuery({ queryKey: ["runs"], queryFn: api.getRuns });
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: api.getAgents });

  if (isLoading) return <p className="text-muted">Loading runs…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Runs</h1>

      {runs.length === 0 ? (
        <Card className="text-muted">No runs yet.</Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="p-3">Run ID</th>
                <th className="p-3">Agent</th>
                <th className="p-3">Status</th>
                <th className="p-3">Started</th>
                <th className="p-3">Completed</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => {
                const agent = agents.find((a) => a.id === run.agentId);
                return (
                  <tr key={run.id} className="border-b border-border hover:bg-background">
                    <td className="p-3">
                      <Link to={`/runs/${run.id}`} className="font-mono text-accent hover:underline">
                        {run.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="p-3">{agent?.name ?? run.agentId.slice(0, 8)}</td>
                    <td className="p-3">
                      <Badge status={run.status} />
                    </td>
                    <td className="p-3 text-muted">
                      {run.startedAt ? new Date(run.startedAt).toLocaleString() : "—"}
                    </td>
                    <td className="p-3 text-muted">
                      {run.completedAt ? new Date(run.completedAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
