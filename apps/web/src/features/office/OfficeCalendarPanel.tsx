import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { addLocalDays, buildOfficeCalendarEntries, startOfLocalDay } from "./office-calendar";

function formatDayHeading(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function OfficeCalendarPanel() {
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: routines = [] } = useQuery({
    queryKey: ["office-routines"],
    queryFn: api.getOfficeRoutines,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["office-tasks"],
    queryFn: api.getOfficeTasks,
  });
  const { data: schedules = [] } = useQuery({
    queryKey: ["schedules"],
    queryFn: api.getSchedules,
  });

  const { rangeStart, rangeEnd, days } = useMemo(() => {
    const today = startOfLocalDay(new Date());
    const start = addLocalDays(today, weekOffset * 7);
    const end = addLocalDays(start, 7);
    const dayList = Array.from({ length: 7 }, (_, index) => addLocalDays(start, index));
    return { rangeStart: start, rangeEnd: end, days: dayList };
  }, [weekOffset]);

  const entries = useMemo(
    () =>
      buildOfficeCalendarEntries({
        routines,
        tasks,
        schedules,
        rangeStart,
        rangeEnd,
      }),
    [routines, tasks, schedules, rangeStart, rangeEnd],
  );

  const entriesByDay = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const day of days) {
      map.set(startOfLocalDay(day).toISOString(), []);
    }
    for (const entry of entries) {
      const key = startOfLocalDay(entry.at).toISOString();
      const bucket = map.get(key);
      if (bucket) bucket.push(entry);
    }
    return map;
  }, [days, entries]);

  return (
    <section className="space-y-3 rounded border border-border bg-card/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Calendar (local week)</p>
        <div className="flex gap-2">
          <button
            type="button"
            className="border border-border px-2 py-1 text-xs uppercase text-muted hover:border-accent/40"
            onClick={() => setWeekOffset((value) => value - 1)}
          >
            Prev
          </button>
          <button
            type="button"
            className="border border-border px-2 py-1 text-xs uppercase text-muted hover:border-accent/40"
            onClick={() => setWeekOffset(0)}
          >
            Today
          </button>
          <button
            type="button"
            className="border border-border px-2 py-1 text-xs uppercase text-muted hover:border-accent/40"
            onClick={() => setWeekOffset((value) => value + 1)}
          >
            Next
          </button>
        </div>
      </div>
      <p className="text-xs text-muted">
        Read-only view of routine cron slots, scheduled office tasks, and existing agent/orchestration schedules.
        Fires only while the dashboard is open (Phase 1).
      </p>
      <div className="grid gap-3 md:grid-cols-7">
        {days.map((day) => {
          const key = startOfLocalDay(day).toISOString();
          const dayEntries = entriesByDay.get(key) ?? [];
          return (
            <div key={key} className="min-h-24 rounded border border-border/80 bg-background/60 p-2">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent">
                {formatDayHeading(day)}
              </p>
              <ul className="space-y-1">
                {dayEntries.length === 0 ? (
                  <li className="text-[10px] text-muted">—</li>
                ) : (
                  dayEntries.map((entry) => (
                    <li key={entry.id} className="text-[10px] leading-snug text-foreground">
                      <span className="hud-mono text-muted">{formatTime(entry.at)}</span>{" "}
                      <span className="uppercase text-muted">{entry.kind}</span> {entry.label}
                      {entry.late ? <span className="text-amber-400"> late</span> : null}
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
