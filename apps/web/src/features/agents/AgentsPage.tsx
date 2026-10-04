import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { resolveDefaultRunInput } from "@jaha-eye/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export function AgentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: agents = [], isLoading } = useQuery({ queryKey: ["agents"], queryFn: api.getAgents });

  const deleteMutation = useMutation({
    mutationFn: api.deleteAgent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });

  const runMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: string }) => api.startRun(id, input),
    onSuccess: (data) => navigate(`/runs/${data.runId}`),
  });

  if (isLoading) return <p className="text-muted">Loading agents…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="hud-kicker text-base text-foreground">Agents</h1>
        <Button onClick={() => navigate("/agents/new")}>New agent</Button>
      </div>

      {agents.length === 0 ? (
        <Card className="text-muted">No agents yet. Create one to get started.</Card>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Link to={`/agents/${agent.id}`} className="text-lg font-semibold hover:text-accent">
                    {agent.name}
                  </Link>
                  <Badge status={agent.status} />
                </div>
                <p className="text-sm text-muted">{agent.description ?? agent.slug}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={agent.status === "disabled" || runMutation.isPending}
                  onClick={() =>
                    runMutation.mutate({ id: agent.id, input: resolveDefaultRunInput(agent) })
                  }
                >
                  Run
                </Button>
                <Button variant="outline" onClick={() => navigate(`/agents/${agent.id}`)}>
                  Edit
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm("Delete this agent?")) deleteMutation.mutate(agent.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
