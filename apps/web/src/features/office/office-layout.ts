import { hashDepartmentColor } from "./office-colors";

export const DESK_COLUMNS = 4;
export const DESK_SPACING = 2.4;
export const POD_PADDING = 2.5;
export const POD_GAP = 5;

export type OfficeLayoutAgent = {
  id: string;
  name: string;
  department: string | null;
  isDepartmentLead?: boolean;
};

export type DeskLayout = {
  agentId: string;
  agentName: string;
  isDepartmentLead: boolean;
  position: { x: number; z: number };
};

export type CorridorSegment = {
  origin: { x: number; z: number };
  width: number;
  depth: number;
};

export type PodLayout = {
  key: string;
  label: string;
  color: string;
  origin: { x: number; z: number };
  size: { width: number; depth: number };
  desks: DeskLayout[];
};

export type OfficeLayout = {
  pods: PodLayout[];
  corridors: CorridorSegment[];
  bounds: { width: number; depth: number };
};

export const GENERAL_POD_KEY = "__general__";

export function departmentPodKey(department: string | null | undefined): string {
  const trimmed = department?.trim();
  if (!trimmed) return GENERAL_POD_KEY;
  return trimmed.toLowerCase();
}

export function departmentPodLabel(department: string | null | undefined): string {
  const trimmed = department?.trim();
  return trimmed || "General";
}

function sortPodKeys(keys: string[]): string[] {
  const named = keys.filter((key) => key !== GENERAL_POD_KEY).sort((a, b) => a.localeCompare(b));
  if (keys.includes(GENERAL_POD_KEY)) named.push(GENERAL_POD_KEY);
  return named;
}

function podGridSize(deskCount: number): { cols: number; rows: number; width: number; depth: number } {
  const cols = Math.min(DESK_COLUMNS, Math.max(1, deskCount));
  const rows = Math.max(1, Math.ceil(deskCount / cols));
  const width = POD_PADDING * 2 + (cols - 1) * DESK_SPACING;
  const depth = POD_PADDING * 2 + (rows - 1) * DESK_SPACING;
  return { cols, rows, width, depth };
}

export function computeOfficeLayout(agents: OfficeLayoutAgent[]): OfficeLayout {
  const grouped = new Map<string, OfficeLayoutAgent[]>();

  for (const agent of agents) {
    const key = departmentPodKey(agent.department);
    const bucket = grouped.get(key) ?? [];
    grouped.set(key, [...bucket, agent]);
  }

  const pods: PodLayout[] = [];
  let cursorX = 0;

  for (const key of sortPodKeys([...grouped.keys()])) {
    const members = [...(grouped.get(key) ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    const label = key === GENERAL_POD_KEY ? "General" : departmentPodLabel(members[0]?.department);
    const { cols, width, depth } = podGridSize(members.length);

    const desks: DeskLayout[] = members.map((agent, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      return {
        agentId: agent.id,
        agentName: agent.name,
        isDepartmentLead: agent.isDepartmentLead ?? false,
        position: {
          x: POD_PADDING + col * DESK_SPACING,
          z: POD_PADDING + row * DESK_SPACING,
        },
      };
    });

    pods.push({
      key,
      label,
      color: hashDepartmentColor(key),
      origin: { x: cursorX, z: 0 },
      size: { width, depth },
      desks,
    });

    cursorX += width + POD_GAP;
  }

  const boundsWidth = pods.length === 0 ? 0 : cursorX - POD_GAP;
  const boundsDepth =
    pods.length === 0 ? 0 : Math.max(...pods.map((pod) => pod.size.depth));

  return {
    pods,
    corridors: computeCorridorSegments(pods, boundsDepth),
    bounds: { width: boundsWidth, depth: boundsDepth },
  };
}

/** Walkable strip between adjacent department pods. */
export function computeCorridorSegments(
  pods: PodLayout[],
  corridorDepth: number,
): CorridorSegment[] {
  if (pods.length < 2 || corridorDepth <= 0) return [];

  const segments: CorridorSegment[] = [];
  for (let index = 0; index < pods.length - 1; index += 1) {
    const left = pods[index];
    const right = pods[index + 1];
    if (!left || !right) continue;
    segments.push({
      origin: { x: left.origin.x + left.size.width, z: left.origin.z },
      width: POD_GAP,
      depth: corridorDepth,
    });
  }
  return segments;
}
