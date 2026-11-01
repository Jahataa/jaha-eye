import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AgentDefinition } from "@jaha-eye/shared";
import { api } from "../../lib/api";
import { useOfficeStore } from "../../stores/office-store";
import { computeOfficeLayout, departmentPodLabel } from "./office-layout";
import { deriveDeskStates, type DeskVisualState } from "./desk-state";
import { DeskPanel } from "./DeskPanel";
import { OfficeTaskBar } from "./OfficeTaskBar";
import { OfficeTaskBoard } from "./OfficeTaskBoard";
import { OfficeBrainPanel } from "./OfficeBrainPanel";
import { OfficeCalendarPanel } from "./OfficeCalendarPanel";
import { cn } from "../../lib/utils";

const OfficeScene = lazy(() => import("./OfficeScene"));

const ACTIVE_RUN_STATUSES = new Set(["queued", "running", "waiting"]);

function countByState(states: Record<string, { state: DeskVisualState }>): Record<DeskVisualState, number> {
  const counts: Record<DeskVisualState, number> = {
    idle: 0,
    working: 0,
    waiting: 0,
    done: 0,
    failed: 0,
    disabled: 0,
  };
  for (const entry of Object.values(states)) {
    counts[entry.state] += 1;
  }
  return counts;
}

export function OfficePage() {
  const queryClient = useQueryClient();
  const taskStatusRef = useRef<Map<string, string>>(new Map());
  const [tab, setTab] = useState<"floor" | "brain" | "calendar">("floor");
  const selectedAgentId = useOfficeStore((state) => state.selectedAgentId);
  const setSelectedAgentId = useOfficeStore((state) => state.setSelectedAgentId);
  const webglAvailable = useOfficeStore((state) => state.webglAvailable);

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: api.getAgents,
  });

  const { data: runs = [] } = useQuery({
    queryKey: ["runs"],
    queryFn: api.getRuns,
    refetchInterval: (query) => {
      const data = query.state.data ?? [];
      return data.some((run) => ACTIVE_RUN_STATUSES.has(run.status)) ? 3_000 : 15_000;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["office-tasks"],
    queryFn: api.getOfficeTasks,
    refetchInterval: 5_000,
  });

  const { data: usage } = useQuery({
    queryKey: ["office-usage"],
    queryFn: api.getOfficeUsage,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    let shouldRefreshBrain = false;
    for (const task of tasks) {
      const prev = taskStatusRef.current.get(task.id);
      if (
        prev !== task.status &&
        (task.status === "done" || task.status === "error")
      ) {
        shouldRefreshBrain = true;
      }
      taskStatusRef.current.set(task.id, task.status);
    }
    if (shouldRefreshBrain) {
      void queryClient.invalidateQueries({ queryKey: ["office-brain"] });
      void queryClient.invalidateQueries({ queryKey: ["office-usage"] });
    }
  }, [tasks, queryClient]);

  const waitingAgentIds = useMemo(
    () =>
      new Set(
        tasks.filter((task) => task.status === "waiting" && task.agentId).map((task) => task.agentId!),
      ),
    [tasks],
  );

  const teamWorkingAgentIds = useMemo(
    () =>
      new Set(
        tasks.flatMap((task) =>
          task.status === "running" && task.teamPieceAgentIds ? task.teamPieceAgentIds : [],
        ),
      ),
    [tasks],
  );

  const layout = useMemo(
    () =>
      computeOfficeLayout(
        agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          department: agent.department,
          isDepartmentLead: agent.isDepartmentLead,
        })),
      ),
    [agents],
  );

  const deskStates = useMemo(
    () => deriveDeskStates(agents, runs, Date.now(), waitingAgentIds, teamWorkingAgentIds),
    [agents, runs, waitingAgentIds, teamWorkingAgentIds],
  );
  const stateCounts = useMemo(() => countByState(deskStates), [deskStates]);
  const agentsById = useMemo(
    () =>
      Object.fromEntries(agents.map((agent) => [agent.id, agent])) as Record<string, AgentDefinition>,
    [agents],
  );

  const selectedAgent = selectedAgentId ? agentsById[selectedAgentId] : undefined;
  const selectedStreamRunId = useMemo(() => {
    if (!selectedAgentId) return undefined;
    const deskRunId = deskStates[selectedAgentId]?.latestRunId;
    if (deskRunId) return deskRunId;
    const activeTask = tasks.find(
      (task) =>
        (task.status === "running" || task.status === "waiting") &&
        (task.agentId === selectedAgentId ||
          task.teamPieceAgentIds?.includes(selectedAgentId)),
    );
    return activeTask?.latestRunId ?? undefined;
  }, [selectedAgentId, deskStates, tasks]);

  const selectedRunStatus = useMemo(() => {
    if (!selectedStreamRunId || !selectedAgentId) return undefined;
    const fromList = runs.find((run) => run.id === selectedStreamRunId)?.status;
    if (fromList) return fromList;
    const activeTask = tasks.find(
      (task) =>
        task.latestRunId === selectedStreamRunId &&
        (task.agentId === selectedAgentId ||
          task.teamPieceAgentIds?.includes(selectedAgentId)),
    );
    if (activeTask?.status === "running") return "running";
    return undefined;
  }, [selectedStreamRunId, selectedAgentId, runs, tasks]);

  const selectedAgentTasks = useMemo(() => {
    if (!selectedAgentId) return [];
    return tasks.filter(
      (task) =>
        task.agentId === selectedAgentId ||
        task.teamPieceAgentIds?.includes(selectedAgentId),
    );
  }, [tasks, selectedAgentId]);
  const animate = Object.values(deskStates).some((entry) => entry.state === "working");
  const waitingCount = tasks.filter((task) => task.status === "waiting").length;

  if (agentsLoading) {
    return <p className="text-muted">Loading office…</p>;
  }

  const usageTotal = (usage?.window5h.inputTokens ?? 0) + (usage?.window5h.outputTokens ?? 0);

  return (
    <div className="flex h-[calc(100vh-4.5rem)] flex-col gap-3 overflow-y-auto">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="hud-kicker text-base text-foreground">Office</h1>
          <p className="text-sm text-muted">
            Operator console — router, tasks, approvals, brain, routines.{" "}
            <Link to="/office/skills" className="text-accent hover:underline">
              Skills
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-3 hud-mono text-[10px] uppercase tracking-wider text-muted">
          <span>
            Approvals <span className="text-accent">{waitingCount}</span>
          </span>
          <span>
            Working <span className="text-accent">{stateCounts.working}</span>
          </span>
          <span>
            Waiting <span className="text-accent">{stateCounts.waiting}</span>
          </span>
          <span>
            Usage 5h <span className="text-accent">{usageTotal}</span>
            {usage?.window5h.estimated ? " (est.)" : ""}
          </span>
        </div>
      </div>

      <OfficeTaskBar agents={agents} />
      <OfficeTaskBoard tasks={tasks} />

      <div className="flex gap-2">
        <button
          type="button"
          className={cn(
            "px-3 py-1 text-xs uppercase tracking-wider",
            tab === "floor" ? "text-accent border border-accent/50" : "text-muted",
          )}
          onClick={() => setTab("floor")}
        >
          Floor
        </button>
        <button
          type="button"
          className={cn(
            "px-3 py-1 text-xs uppercase tracking-wider",
            tab === "brain" ? "text-accent border border-accent/50" : "text-muted",
          )}
          onClick={() => setTab("brain")}
        >
          Brain
        </button>
        <button
          type="button"
          className={cn(
            "px-3 py-1 text-xs uppercase tracking-wider",
            tab === "calendar" ? "text-accent border border-accent/50" : "text-muted",
          )}
          onClick={() => setTab("calendar")}
        >
          Calendar
        </button>
      </div>

      {tab === "calendar" ? (
        <OfficeCalendarPanel />
      ) : tab === "brain" ? (
        <OfficeBrainPanel onFocusFloor={() => setTab("floor")} />
      ) : (
        <div className="flex min-h-[28rem] flex-1 overflow-hidden rounded border border-border">
          <div className="relative min-h-[28rem] min-w-0 flex-1 overflow-hidden">
            {agents.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted">
                No agents yet. Create agents and assign departments to populate the floor.
              </div>
            ) : webglAvailable ? (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-muted">Loading scene…</div>
                }
              >
                <OfficeScene
                  layout={layout}
                  deskStates={deskStates}
                  animate={animate}
                  selectedAgentId={selectedAgentId}
                  onSelectAgent={setSelectedAgentId}
                />
              </Suspense>
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-sm text-muted">
                WebGL is unavailable. Use the desk list below to select agents and start runs.
              </div>
            )}
          </div>
          <DeskPanel
            agent={selectedAgent}
            deskState={selectedAgentId ? deskStates[selectedAgentId] : undefined}
            streamRunId={selectedStreamRunId}
            latestRunStatus={selectedRunStatus}
            tasks={selectedAgentTasks}
          />
        </div>
      )}

      {tab === "floor" && (
        <section aria-label="Desk list" className="rounded border border-border bg-card/40 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Desks</p>
          <ul className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
            {agents.map((agent) => {
              const state = deskStates[agent.id]?.state ?? "idle";
              const selected = selectedAgentId === agent.id;
              return (
                <li key={agent.id}>
                  <button
                    type="button"
                    className={cn(
                      "rounded border px-2 py-1 text-left text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                      selected
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border bg-background/80 text-foreground hover:border-accent/40",
                    )}
                    onClick={() => setSelectedAgentId(agent.id)}
                  >
                    <span className="font-semibold">{agent.name}</span>
                    <span className="ml-2 hud-mono text-[10px] uppercase text-muted">
                      {departmentPodLabel(agent.department)} · {state}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
