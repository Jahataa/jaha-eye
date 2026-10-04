import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { isValidCronExpression, nextCronOccurrence, type Schedule } from "@jaha-eye/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { ScheduleDialog } from "./ScheduleDialog";
import {
  useDeleteSchedule,
  useDisableSchedule,
  useEnableSchedule,
  useSchedules,
} from "./queries";
import { scheduleTargetLabel, type FixedScheduleTarget } from "./schedule-utils";

function nextFirePreview(expression: string): string {
  if (!isValidCronExpression(expression)) return "—";
  try {
    return nextCronOccurrence(expression).toLocaleString();
  } catch {
    return "—";
  }
}

interface ScheduleSectionProps {
  fixedTarget: FixedScheduleTarget;
}

export function ScheduleSection({ fixedTarget }: ScheduleSectionProps) {
  const { data: schedules = [], isLoading } = useSchedules();
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: api.getAgents });
  const { data: orchestrations = [] } = useQuery({
    queryKey: ["orchestrations"],
    queryFn: api.getOrchestrations,
  });

  const enableMutation = useEnableSchedule();
  const disableMutation = useDisableSchedule();
  const deleteMutation = useDeleteSchedule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const targetSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      if (fixedTarget.targetType === "agent") {
        return schedule.agentId === fixedTarget.agentId;
      }
      return schedule.orchestrationId === fixedTarget.orchestrationId;
    });
  }, [schedules, fixedTarget]);

  function openCreate() {
    setEditingSchedule(null);
    setDialogOpen(true);
  }

  function openEdit(schedule: Schedule) {
    setEditingSchedule(schedule);
    setDialogOpen(true);
  }

  function toggleEnabled(schedule: Schedule) {
    if (schedule.enabled) {
      disableMutation.mutate(schedule.id);
    } else {
      enableMutation.mutate(schedule.id);
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="hud-kicker">Schedules</p>
        <Button variant="outline" className="h-8 px-3 text-xs" onClick={openCreate}>
          Add schedule
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading schedules…</p>
      ) : targetSchedules.length === 0 ? (
        <p className="text-sm text-muted">No schedules for this target.</p>
      ) : (
        <div className="space-y-2">
          {targetSchedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex flex-wrap items-center justify-between gap-2 border border-border/60 bg-background/40 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {scheduleTargetLabel(schedule, agents, orchestrations)}
                </p>
                <p className="hud-mono text-xs text-muted">{schedule.expression}</p>
                <p className="text-xs text-muted">Next: {nextFirePreview(schedule.expression)}</p>
                {schedule.lastFiredAt && (
                  <p className="text-xs text-muted">
                    Last: {new Date(schedule.lastFiredAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <Checkbox
                    checked={schedule.enabled}
                    onChange={() => toggleEnabled(schedule)}
                    disabled={enableMutation.isPending || disableMutation.isPending}
                  />
                  Enabled
                </label>
                <Button
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => openEdit(schedule)}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  className="h-7 px-2 text-xs"
                  onClick={() => {
                    if (confirm("Delete this schedule?")) deleteMutation.mutate(schedule.id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted">
        Schedules fire only while this UI is open.{" "}
        <Link to="/schedules" className="text-accent hover:underline">
          Manage all schedules
        </Link>
      </p>

      <ScheduleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        schedule={editingSchedule}
        fixedTarget={fixedTarget}
      />
    </Card>
  );
}
