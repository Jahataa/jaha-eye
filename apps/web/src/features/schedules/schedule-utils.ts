import type { Schedule, ScheduleTargetType } from "@jaha-eye/shared";

export function scheduleTargetLabel(
  schedule: Pick<Schedule, "targetType" | "agentId" | "orchestrationId" | "name">,
  agents: { id: string; name: string }[],
  orchestrations: { id: string; name: string }[],
): string {
  if (schedule.name?.trim()) return schedule.name.trim();
  if (schedule.targetType === "agent" && schedule.agentId) {
    const agent = agents.find((a) => a.id === schedule.agentId);
    return agent?.name ?? `Agent ${schedule.agentId.slice(0, 8)}`;
  }
  if (schedule.targetType === "orchestration" && schedule.orchestrationId) {
    const orch = orchestrations.find((o) => o.id === schedule.orchestrationId);
    return orch?.name ?? `Orchestration ${schedule.orchestrationId.slice(0, 8)}`;
  }
  return "Unknown target";
}

export function scheduleTargetPath(
  schedule: Pick<Schedule, "targetType" | "agentId" | "orchestrationId">,
): string | null {
  if (schedule.targetType === "agent" && schedule.agentId) {
    return `/agents/${schedule.agentId}`;
  }
  if (schedule.targetType === "orchestration" && schedule.orchestrationId) {
    return `/orchestrations/${schedule.orchestrationId}`;
  }
  return null;
}

export interface FixedScheduleTarget {
  targetType: ScheduleTargetType;
  agentId?: string;
  orchestrationId?: string;
}
