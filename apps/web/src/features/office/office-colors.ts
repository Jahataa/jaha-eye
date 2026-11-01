import type { DeskVisualState } from "./desk-state";

export const DEPARTMENT_PALETTE = [
  "#4ade80",
  "#60a5fa",
  "#c084fc",
  "#fb923c",
  "#f472b6",
  "#2dd4bf",
  "#facc15",
  "#818cf8",
] as const;

export function hashDepartmentColor(departmentKey: string): string {
  let hash = 0;
  for (let index = 0; index < departmentKey.length; index += 1) {
    hash = (hash * 31 + departmentKey.charCodeAt(index)) >>> 0;
  }
  return DEPARTMENT_PALETTE[hash % DEPARTMENT_PALETTE.length] ?? DEPARTMENT_PALETTE[0];
}

export const DESK_STATE_COLORS: Record<DeskVisualState, string> = {
  idle: "#64748b",
  working: "#22d3ee",
  waiting: "#fbbf24",
  done: "#4ade80",
  failed: "#f87171",
  disabled: "#334155",
};
