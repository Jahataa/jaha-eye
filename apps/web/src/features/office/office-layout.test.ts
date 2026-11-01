import { describe, expect, it } from "vitest";
import {
  computeCorridorSegments,
  computeOfficeLayout,
  departmentPodKey,
  DESK_SPACING,
  POD_GAP,
  POD_PADDING,
} from "./office-layout";

describe("departmentPodKey", () => {
  it("maps blank department to general", () => {
    expect(departmentPodKey(null)).toBe("__general__");
    expect(departmentPodKey("  ")).toBe("__general__");
  });
});

describe("computeOfficeLayout", () => {
  it("groups agents by department with General last", () => {
    const layout = computeOfficeLayout([
      { id: "1", name: "Zed", department: null },
      { id: "2", name: "Amy", department: "Research" },
      { id: "3", name: "Bob", department: "Sales" },
    ]);

    expect(layout.pods.map((pod) => pod.label)).toEqual(["Research", "Sales", "General"]);
  });

  it("sorts desks by agent name within a pod", () => {
    const layout = computeOfficeLayout([
      { id: "1", name: "Zed", department: "Ops" },
      { id: "2", name: "Amy", department: "Ops" },
    ]);
    const desks = layout.pods[0]?.desks ?? [];
    expect(desks.map((desk) => desk.agentName)).toEqual(["Amy", "Zed"]);
  });

  it("assigns unique desk positions within a pod", () => {
    const layout = computeOfficeLayout([
      { id: "1", name: "A", department: "Ops" },
      { id: "2", name: "B", department: "Ops" },
    ]);
    const positions = layout.pods[0]?.desks.map((desk) => desk.position) ?? [];
    const keys = positions.map((pos) => `${pos.x},${pos.z}`);
    expect(new Set(keys).size).toBe(positions.length);
    expect(positions[0]).toEqual({ x: POD_PADDING, z: POD_PADDING });
    expect(positions[1]?.x).toBe(POD_PADDING + DESK_SPACING);
  });

  it("adds corridor segments between adjacent pods", () => {
    const layout = computeOfficeLayout([
      { id: "1", name: "Amy", department: "Research" },
      { id: "2", name: "Bob", department: "Sales" },
    ]);
    expect(layout.corridors).toHaveLength(1);
    expect(layout.corridors[0]?.width).toBe(POD_GAP);
  });
});

describe("computeCorridorSegments", () => {
  it("returns empty for fewer than two pods", () => {
    const layout = computeOfficeLayout([{ id: "1", name: "Amy", department: "Ops" }]);
    expect(computeCorridorSegments(layout.pods, layout.bounds.depth)).toEqual([]);
  });
});
