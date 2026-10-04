import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatLocalMinuteSlot, isCronDue } from "@jaha-eye/shared";
import { api } from "../../lib/api";
import { useUiStore } from "../../stores/ui-store";
import { scheduleTargetLabel } from "./schedule-utils";

export function ScheduleTicker() {
  const queryClient = useQueryClient();
  const setActivity = useUiStore((s) => s.setActivity);
  const firedRef = useRef(new Set<string>());

  const { data: schedules = [] } = useQuery({
    queryKey: ["schedules"],
    queryFn: api.getSchedules,
    refetchInterval: 60_000,
  });
  const { data: agents = [] } = useQuery({ queryKey: ["agents"], queryFn: api.getAgents });
  const { data: orchestrations = [] } = useQuery({
    queryKey: ["orchestrations"],
    queryFn: api.getOrchestrations,
  });

  const enabledSchedules = schedules.filter((s) => s.enabled);

  useEffect(() => {
    if (enabledSchedules.length === 0) return;

    const tick = () => {
      const now = new Date();
      const slot = formatLocalMinuteSlot(now);

      for (const schedule of enabledSchedules) {
        if (!isCronDue(schedule.expression, now)) continue;

        const key = `${schedule.id}:${slot}`;
        if (firedRef.current.has(key)) continue;
        firedRef.current.add(key);

        void (async () => {
          try {
            const result = await api.fireSchedule(schedule.id, slot);
            if ("skipped" in result && result.skipped) return;

            await queryClient.invalidateQueries({ queryKey: ["runs"] });
            await queryClient.invalidateQueries({ queryKey: ["schedules"] });

            const label = scheduleTargetLabel(schedule, agents, orchestrations);
            setActivity(`Scheduled run started for ${label}`);
          } catch {
            firedRef.current.delete(key);
          }
        })();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [enabledSchedules, agents, orchestrations, queryClient, setActivity]);

  return null;
}
