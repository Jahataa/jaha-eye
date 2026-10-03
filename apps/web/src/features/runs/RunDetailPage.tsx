import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Card, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { EventTimeline } from "../../components/events/EventTimeline";
import { useRunStream } from "../../hooks/use-run-stream";

const TERMINAL = new Set(["completed", "failed", "cancelled"]);

export function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: run, isLoading } = useQuery({
    queryKey: ["runs", id],
    queryFn: () => api.getRun(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL.has(status) ? false : 2000;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["runs", id, "events"],
    queryFn: () => api.getRunEvents(id!),
    enabled: !!id,
  });

  const { liveEvents, activity } = useRunStream(id, run?.status);

  const events = useMemo(() => {
    const map = new Map<number, (typeof history)[0]>();
    for (const e of history) map.set(e.sequence, e);
    for (const e of liveEvents) map.set(e.sequence, e);
    return [...map.values()].sort((a, b) => a.sequence - b.sequence);
  }, [history, liveEvents]);

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelRun(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runs", id] });
    },
  });

  if (isLoading || !run) return <p className="text-muted">Loading run…</p>;

  const inputMessage =
    typeof run.input === "object" && run.input !== null && "message" in run.input
      ? String((run.input as { message: string }).message)
      : JSON.stringify(run.input);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Run {run.id.slice(0, 8)}…</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge status={run.status} />
            {activity && !TERMINAL.has(run.status) && (
              <span className="text-sm text-muted">{activity}</span>
            )}
          </div>
        </div>
        {!TERMINAL.has(run.status) && (
          <Button variant="danger" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
            Stop
          </Button>
        )}
      </div>

      <Card>
        <CardTitle>Input</CardTitle>
        <pre className="mt-2 whitespace-pre-wrap text-sm">{inputMessage}</pre>
      </Card>

      {run.output != null && (
        <Card>
          <CardTitle>Output</CardTitle>
          <pre className="mt-2 whitespace-pre-wrap text-sm">{JSON.stringify(run.output, null, 2)}</pre>
        </Card>
      )}

      {run.error && (
        <Card className="border-danger">
          <CardTitle className="text-danger">Error</CardTitle>
          <p className="mt-2 text-sm">{run.error.message}</p>
        </Card>
      )}

      <EventTimeline events={events} />
    </div>
  );
}
