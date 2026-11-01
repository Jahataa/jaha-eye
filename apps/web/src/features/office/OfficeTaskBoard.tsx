import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { OfficeTask } from "@jaha-eye/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { cn } from "../../lib/utils";

const COLUMNS: Array<{ key: OfficeTask["status"]; label: string }> = [
  { key: "scheduled", label: "Scheduled" },
  { key: "running", label: "Doing" },
  { key: "waiting", label: "Waiting" },
  { key: "done", label: "Done" },
  { key: "error", label: "Error" },
  { key: "cancelled", label: "Cancelled" },
];

type OfficeTaskBoardProps = {
  tasks: OfficeTask[];
};

export function OfficeTaskBoard({ tasks }: OfficeTaskBoardProps) {
  const queryClient = useQueryClient();
  const [rejectFeedback, setRejectFeedback] = useState<Record<string, string>>({});

  const invalidateTasks = () => {
    queryClient.invalidateQueries({ queryKey: ["office-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["runs"] });
    queryClient.invalidateQueries({ queryKey: ["office-brain"] });
    queryClient.invalidateQueries({ queryKey: ["office-usage"] });
  };

  const approveMutation = useMutation({
    mutationFn: api.approveOfficeTask,
    onSuccess: invalidateTasks,
  });

  const rejectMutation = useMutation({
    mutationFn: ({ taskId, feedback }: { taskId: string; feedback: string }) =>
      api.rejectOfficeTask(taskId, feedback),
    onSuccess: invalidateTasks,
  });

  return (
    <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Task board">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.key);
        return (
          <div
            key={column.key}
            className="rounded border-2 border-border bg-card p-3 shadow-sm"
          >
            <p className="mb-3 flex items-baseline justify-between text-xs font-bold uppercase tracking-wider text-foreground">
              <span>{column.label}</span>
              <span className="hud-mono tabular-nums text-accent">{columnTasks.length}</span>
            </p>
            <ul className="space-y-2 min-h-[4rem]">
              {columnTasks.length === 0 ? (
                <li className="text-xs text-muted">No tasks</li>
              ) : (
                columnTasks.map((task) => (
                  <li
                    key={task.id}
                    className={cn(
                      "rounded border border-border bg-background p-2.5 text-xs shadow-sm",
                      task.status === "waiting" && "border-amber-500/50 bg-amber-500/5",
                      task.status === "error" && "border-danger/40 bg-danger/5",
                      task.status === "cancelled" && "border-muted/50 bg-muted/5",
                    )}
                  >
                    <p className="font-semibold text-foreground text-wrap-pretty">
                      {task.title || task.text.slice(0, 40)}
                    </p>
                    <p className="mt-1 hud-mono text-[10px] text-muted">
                      {task.department}
                      {task.late ? " · late" : ""}
                      {task.needsOk && task.status === "waiting" ? " · draft" : ""}
                    </p>
                    {task.draft && task.status === "waiting" && (
                      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-[10px] text-muted">
                        {task.draft}
                      </p>
                    )}
                    {task.status === "done" && task.result && (
                      <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-[10px] text-foreground/90">
                        {task.result}
                      </p>
                    )}
                    {(task.status === "error" || task.status === "cancelled") && task.result && (
                      <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-[10px] text-danger">
                        {task.result}
                      </p>
                    )}
                    {task.status === "waiting" && (
                      <div className="mt-2 space-y-2">
                        <Button
                          type="button"
                          className="h-7 px-2 py-0 text-[10px]"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(task.id)}
                        >
                          Approve
                        </Button>
                        <Textarea
                          className="text-[10px]"
                          rows={2}
                          placeholder="Reject feedback (re-runs as revision)"
                          value={rejectFeedback[task.id] ?? ""}
                          onChange={(event) =>
                            setRejectFeedback((prev) => ({
                              ...prev,
                              [task.id]: event.target.value,
                            }))
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="h-7 px-2 py-0 text-[10px]"
                          disabled={
                            !rejectFeedback[task.id]?.trim() || rejectMutation.isPending
                          }
                          onClick={() =>
                            rejectMutation.mutate({
                              taskId: task.id,
                              feedback: rejectFeedback[task.id]!.trim(),
                            })
                          }
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
