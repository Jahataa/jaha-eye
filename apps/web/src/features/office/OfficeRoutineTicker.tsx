import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatLocalMinuteSlot, isCronDue } from "@jaha-eye/shared";
import { api } from "../../lib/api";
import { useUiStore } from "../../stores/ui-store";

export function OfficeRoutineTicker() {
  const queryClient = useQueryClient();
  const setActivity = useUiStore((s) => s.setActivity);
  const firedRef = useRef(new Set<string>());
  const { data: routines = [] } = useQuery({
    queryKey: ["office-routines"],
    queryFn: api.getOfficeRoutines,
    refetchInterval: 60_000,
  });

  const enabled = routines.filter((routine) => routine.enabled);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const slot = formatLocalMinuteSlot(now);

      void api.officeTick().catch(() => undefined);

      if (enabled.length === 0) return;

      for (const routine of enabled) {
        if (!isCronDue(routine.expression, now)) continue;
        const key = `${routine.id}:${slot}`;
        if (firedRef.current.has(key)) continue;
        firedRef.current.add(key);

        void (async () => {
          try {
            const result = await api.fireOfficeRoutine(routine.id, slot);
            if ("skipped" in result && result.skipped) return;
            setActivity(`Routine fired: ${routine.name}`);
            await queryClient.invalidateQueries({ queryKey: ["office-tasks"] });
            await queryClient.invalidateQueries({ queryKey: ["runs"] });
          } catch {
            firedRef.current.delete(key);
          }
        })();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [enabled, queryClient, setActivity]);

  return null;
}
