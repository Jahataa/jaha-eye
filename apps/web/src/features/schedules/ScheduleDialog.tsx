import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  isValidCronExpression,
  nextCronOccurrence,
  type Schedule,
} from "@jaha-eye/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { CRON_PRESETS } from "./cron-presets";
import { useCreateSchedule, useUpdateSchedule } from "./queries";
import type { FixedScheduleTarget } from "./schedule-utils";

interface ScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  schedule?: Schedule | null;
  fixedTarget?: FixedScheduleTarget;
}

export function ScheduleDialog({ open, onClose, schedule, fixedTarget }: ScheduleDialogProps) {
  const isEdit = Boolean(schedule);
  const createMutation = useCreateSchedule();
  const updateMutation = useUpdateSchedule();

  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: api.getAgents });
  const { data: orchestrations = [] } = useQuery({
    queryKey: ["orchestrations"],
    queryFn: api.getOrchestrations,
  });

  const [name, setName] = useState("");
  const [targetType, setTargetType] = useState<"agent" | "orchestration">("agent");
  const [agentId, setAgentId] = useState("");
  const [orchestrationId, setOrchestrationId] = useState("");
  const [expression, setExpression] = useState("* * * * *");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (schedule) {
      setName(schedule.name ?? "");
      setTargetType(schedule.targetType);
      setAgentId(schedule.agentId ?? "");
      setOrchestrationId(schedule.orchestrationId ?? "");
      setExpression(schedule.expression);
      setInput(schedule.input ?? "");
      return;
    }
    setName("");
    setExpression("* * * * *");
    setInput("");
    if (fixedTarget) {
      setTargetType(fixedTarget.targetType);
      setAgentId(fixedTarget.agentId ?? "");
      setOrchestrationId(fixedTarget.orchestrationId ?? "");
    } else {
      setTargetType("agent");
      setAgentId(agents[0]?.id ?? "");
      setOrchestrationId(orchestrations[0]?.id ?? "");
    }
  }, [open, schedule, fixedTarget, agents, orchestrations]);

  const nextFire = useMemo(() => {
    if (!isValidCronExpression(expression)) return null;
    try {
      return nextCronOccurrence(expression).toLocaleString();
    } catch {
      return null;
    }
  }, [expression]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidCronExpression(expression)) {
      setError("Invalid cron expression.");
      return;
    }

    const payload = {
      name: name.trim() || null,
      targetType,
      agentId: targetType === "agent" ? agentId : null,
      orchestrationId: targetType === "orchestration" ? orchestrationId : null,
      expression: expression.trim(),
      input: input.trim() || null,
    };

    if (targetType === "agent" && !payload.agentId) {
      setError("Select an agent.");
      return;
    }
    if (targetType === "orchestration" && !payload.orchestrationId) {
      setError("Select an orchestration.");
      return;
    }

    try {
      if (isEdit && schedule) {
        await updateMutation.mutateAsync({ id: schedule.id, data: payload });
      } else {
        await createMutation.mutateAsync({ ...payload, enabled: true });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
      <div
        className="w-full max-w-lg border border-border bg-card p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-dialog-title"
      >
        <h2 id="schedule-dialog-title" className="hud-kicker mb-4 text-base text-foreground">
          {isEdit ? "Edit schedule" : "New schedule"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name (optional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Daily sync"
            />
          </div>

          {!fixedTarget && (
            <>
              <div>
                <Label>Target type</Label>
                <select
                  className="hud-mono mt-1 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent/60"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as "agent" | "orchestration")}
                >
                  <option value="agent">Agent</option>
                  <option value="orchestration">Orchestration</option>
                </select>
              </div>
              {targetType === "agent" ? (
                <div>
                  <Label>Agent</Label>
                  <select
                    className="hud-mono mt-1 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent/60"
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                  >
                    {agents.length === 0 ? (
                      <option value="">No agents</option>
                    ) : (
                      agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              ) : (
                <div>
                  <Label>Orchestration</Label>
                  <select
                    className="hud-mono mt-1 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent/60"
                    value={orchestrationId}
                    onChange={(e) => setOrchestrationId(e.target.value)}
                  >
                    {orchestrations.length === 0 ? (
                      <option value="">No orchestrations</option>
                    ) : (
                      orchestrations.map((orch) => (
                        <option key={orch.id} value={orch.id}>
                          {orch.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}
            </>
          )}

          <div>
            <Label>Cron expression</Label>
            <Input
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              className="hud-mono"
              placeholder="* * * * *"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {CRON_PRESETS.map((preset) => (
                <button
                  key={preset.expression}
                  type="button"
                  className="border border-border px-2 py-1 text-xs text-muted transition hover:border-accent/40 hover:text-accent"
                  onClick={() => setExpression(preset.expression)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {nextFire ? (
              <p className="mt-2 text-xs text-muted">
                Next fire (local): <span className="hud-mono text-foreground">{nextFire}</span>
              </p>
            ) : (
              <p className="mt-2 text-xs text-danger">Invalid expression</p>
            )}
          </div>

          <div>
            <Label>Input override (optional)</Label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Leave blank to use the target default run input"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
