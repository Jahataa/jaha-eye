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
import { scheduleTargetLabel, scheduleTargetPath } from "./schedule-utils";

function nextFirePreview(expression: string): string {
  if (!isValidCronExpression(expression)) return "—";
  try {
    return nextCronOccurrence(expression).toLocaleString();
  } catch {
    return "—";
  }
}

export function SchedulesPage() {
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

  const sortedSchedules = useMemo(
    () => [...schedules].sort((a, b) => a.expression.localeCompare(b.expression)),
    [schedules],
  );

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

  if (isLoading) return <p className="text-muted">Loading schedules…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="hud-kicker text-base text-foreground">Schedules</h1>
          <p className="mt-1 text-sm text-muted">
            Cron jobs fire only while this UI is open, using your local clock.
          </p>
        </div>
        <Button onClick={openCreate}>New schedule</Button>
      </div>

      {sortedSchedules.length === 0 ? (
        <Card className="text-muted">No schedules yet.</Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="hud-kicker p-3">Name</th>
                <th className="hud-kicker p-3">Target</th>
                <th className="hud-kicker p-3">Cron / next</th>
                <th className="hud-kicker p-3">Enabled</th>
                <th className="hud-kicker p-3">Last fire</th>
                <th className="hud-kicker p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedSchedules.map((schedule) => {
                const targetPath = scheduleTargetPath(schedule);
                const label = scheduleTargetLabel(schedule, agents, orchestrations);
                return (
                  <tr key={schedule.id} className="border-b border-border/50 hover:bg-accent/5">
                    <td className="p-3">{schedule.name?.trim() || "—"}</td>
                    <td className="p-3">
                      {targetPath ? (
                        <Link to={targetPath} className="text-accent hover:underline">
                          {label}
                        </Link>
                      ) : (
                        label
                      )}
                    </td>
                    <td className="p-3">
                      <span className="hud-mono block text-xs">{schedule.expression}</span>
                      <span className="text-xs text-muted">
                        Next: {nextFirePreview(schedule.expression)}
                      </span>
                    </td>
                    <td className="p-3">
                      <Checkbox
                        checked={schedule.enabled}
                        onChange={() => toggleEnabled(schedule)}
                        disabled={enableMutation.isPending || disableMutation.isPending}
                        aria-label={`Toggle ${label}`}
                      />
                    </td>
                    <td className="hud-mono p-3 text-xs text-muted">
                      {schedule.lastFiredAt
                        ? new Date(schedule.lastFiredAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
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
                            if (confirm("Delete this schedule?")) {
                              deleteMutation.mutate(schedule.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <ScheduleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        schedule={editingSchedule}
      />
    </div>
  );
}
