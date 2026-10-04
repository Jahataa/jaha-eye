import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { resolveDefaultOrchestrationInput } from "@jaha-eye/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export function OrchestrationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: orchestrations = [], isLoading } = useQuery({
    queryKey: ["orchestrations"],
    queryFn: api.getOrchestrations,
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteOrchestration,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orchestrations"] }),
  });

  const runMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: string }) =>
      api.startOrchestrationRun(id, input),
    onSuccess: (data) => navigate(`/runs/${data.runId}`),
  });

  if (isLoading) return <p className="text-muted">Loading orchestrations…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="hud-kicker text-base text-foreground">Orchestrations</h1>
        <Button onClick={() => navigate("/orchestrations/new")}>New orchestration</Button>
      </div>

      {orchestrations.length === 0 ? (
        <Card className="text-muted">No orchestrations yet. Create a graph to get started.</Card>
      ) : (
        <div className="space-y-3">
          {orchestrations.map((orch) => (
            <Card key={orch.id} className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/orchestrations/${orch.id}`}
                    className="text-lg font-semibold hover:text-accent"
                  >
                    {orch.name}
                  </Link>
                  <Badge status={orch.status} />
                </div>
                <p className="text-sm text-muted">
                  {orch.description ?? orch.slug} · {orch.graph.nodes.length} nodes
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={orch.status === "disabled" || runMutation.isPending}
                  onClick={() =>
                    runMutation.mutate({
                      id: orch.id,
                      input: resolveDefaultOrchestrationInput(orch),
                    })
                  }
                >
                  Run
                </Button>
                <Button variant="outline" onClick={() => navigate(`/orchestrations/${orch.id}`)}>
                  Edit
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm("Delete this orchestration?")) deleteMutation.mutate(orch.id);
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
