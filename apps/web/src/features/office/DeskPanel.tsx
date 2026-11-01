import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AgentDefinition, OfficeTask } from "@jaha-eye/shared";
import { extractAssistantReply, resolveDefaultRunInput } from "@jaha-eye/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useRunStream } from "../../hooks/use-run-stream";
import type { DeskState } from "./desk-state";
import { departmentPodLabel } from "./office-layout";
import { cn } from "../../lib/utils";

type DeskPanelTab = "run" | "tasks" | "lessons" | "brief";

type DeskPanelProps = {
  agent: AgentDefinition | undefined;
  deskState: DeskState | undefined;
  streamRunId: string | undefined;
  latestRunStatus: string | undefined;
  tasks: OfficeTask[];
};

export function DeskPanel({
  agent,
  deskState,
  streamRunId,
  latestRunStatus,
  tasks,
}: DeskPanelProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<DeskPanelTab>("run");
  const [runInput, setRunInput] = useState("");
  const [runError, setRunError] = useState<string | null>(null);
  const [reviseFeedback, setReviseFeedback] = useState("");

  const { data: lessons = [] } = useQuery({
    queryKey: ["office-lessons", agent?.id],
    queryFn: () => api.getOfficeLessons(agent!.id),
    enabled: Boolean(agent?.id),
  });

  useEffect(() => {
    if (!agent) return;
    setRunInput(resolveDefaultRunInput(agent));
    setRunError(null);
  }, [agent]);

  const activeRunId = streamRunId ?? deskState?.latestRunId ?? undefined;
  const openRunId = activeRunId ?? deskState?.latestRunId ?? undefined;

  const { activity, liveEvents } = useRunStream(activeRunId, latestRunStatus, {
    agentNames: agent ? { [agent.id]: agent.name } : undefined,
  });

  const liveReply = liveEvents.length > 0 ? extractAssistantReply(liveEvents) : null;
  const latestDeliverable = tasks.find(
    (task) => task.status === "done" && (task.result?.trim() || task.draft?.trim()),
  );

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!agent) throw new Error("Select a desk first.");
      const text = runInput.trim() || resolveDefaultRunInput(agent);
      const department = agent.department?.trim() || "general";
      return api.createOfficeTask({
        department,
        text,
        agentId: agent.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["office-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      setRunError(null);
    },
    onError: (error) => {
      setRunError(error instanceof Error ? error.message : "Run failed.");
    },
  });

  const reviseMutation = useMutation({
    mutationFn: async (taskId: string) => api.reviseOfficeTask(taskId, reviseFeedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["office-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      setReviseFeedback("");
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: api.deleteOfficeLesson,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["office-lessons", agent?.id] }),
  });

  if (!agent) {
    return (
      <aside className="w-80 shrink-0 border-l border-border bg-card/60 p-4 text-sm text-muted">
        Select a desk to inspect the agent or start a run.
      </aside>
    );
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-3 border-l border-border bg-card/60 p-4">
      <div>
        <p className="hud-kicker text-xs text-muted">Desk</p>
        <h2 className="text-lg font-semibold text-foreground">{agent.name}</h2>
        <p className="hud-mono text-xs text-muted">
          {departmentPodLabel(agent.department)} · {agent.modelName}
        </p>
      </div>

      <div className="flex gap-1">
        {(["run", "tasks", "lessons", "brief"] as DeskPanelTab[]).map((entry) => (
          <button
            key={entry}
            type="button"
            className={cn(
              "px-2 py-1 text-[10px] uppercase tracking-wider",
              tab === entry ? "text-accent border border-accent/40" : "text-muted",
            )}
            onClick={() => setTab(entry)}
          >
            {entry}
          </button>
        ))}
      </div>

      {tab === "run" && (
        <>
          <div className="space-y-1 text-sm">
            <p>
              Desk state:{" "}
              <span className="hud-mono text-accent">{deskState?.state ?? "idle"}</span>
            </p>
            {activity && (
              <p className="hud-mono text-xs text-accent/90">
                <span className="text-muted">Activity // </span>
                {activity}
              </p>
            )}
            {liveReply && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded border border-border bg-background/80 p-2 text-xs whitespace-pre-wrap text-foreground">
                {liveReply}
              </div>
            )}
            {!liveReply && latestDeliverable?.result && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded border border-border bg-background/80 p-2 text-xs whitespace-pre-wrap text-muted">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-accent">Latest deliverable</p>
                {latestDeliverable.result}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="office-run-input">Run input</Label>
            <Input
              id="office-run-input"
              value={runInput}
              onChange={(event) => setRunInput(event.target.value)}
              disabled={agent.status === "disabled"}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={agent.status === "disabled" || runMutation.isPending}
                onClick={() => runMutation.mutate()}
              >
                {runMutation.isPending ? "Starting…" : "Run"}
              </Button>
              {openRunId && (
                <Link
                  to={`/runs/${openRunId}`}
                  className="inline-flex items-center justify-center border border-accent/40 bg-transparent px-4 py-2 text-sm font-semibold uppercase tracking-wider text-accent transition hover:bg-accent/10"
                >
                  Open live run
                </Link>
              )}
            </div>
            {runError && <p className="text-sm text-danger">{runError}</p>}
          </div>
        </>
      )}

      {tab === "tasks" && (
        <ul className="space-y-2 text-xs">
          {tasks.length === 0 && <li className="text-muted">No office tasks for this agent.</li>}
          {tasks.map((task) => (
            <li key={task.id} className="rounded border border-border p-2">
              <p className="font-semibold">{task.title}</p>
              <p className="hud-mono text-[10px] text-muted">{task.status}</p>
              {task.draft && task.status === "waiting" && (
                <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-[10px] text-muted">
                  {task.draft}
                </p>
              )}
              {task.result && (task.status === "done" || task.status === "error") && (
                <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-[10px] text-foreground/90">
                  {task.result}
                </p>
              )}
              {task.status === "done" && (
                <Textarea
                  className="mt-2"
                  value={reviseFeedback}
                  onChange={(e) => setReviseFeedback(e.target.value)}
                  placeholder="Revision feedback"
                  rows={2}
                />
              )}
              {task.status === "done" && (
                <Button
                  type="button"
                  className="mt-2 h-7 px-2 text-[10px]"
                  disabled={!reviseFeedback.trim() || reviseMutation.isPending}
                  onClick={() => reviseMutation.mutate(task.id)}
                >
                  Revise
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {tab === "lessons" && (
        <ul className="space-y-2 text-xs">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="rounded border border-border p-2">
              <p className="hud-mono text-[10px] text-muted">{lesson.kind}</p>
              <p>{lesson.text}</p>
              <Button
                type="button"
                variant="danger"
                className="mt-2 h-7 px-2 text-[10px]"
                onClick={() => deleteLessonMutation.mutate(lesson.id)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}

      {tab === "brief" && (
        <div className="space-y-2 text-sm">
          <p className="whitespace-pre-wrap text-muted">{agent.brief?.trim() || "No brief set."}</p>
          <Link to={`/agents/${agent.id}`} className="text-accent hover:underline">
            Edit brief in agent editor
          </Link>
        </div>
      )}

      <Link
        to={`/agents/${agent.id}`}
        className="text-xs uppercase tracking-wider text-accent hover:underline"
      >
        Edit agent
      </Link>
    </aside>
  );
}
