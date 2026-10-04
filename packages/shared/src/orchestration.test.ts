import { describe, expect, it } from "vitest";
import {
  assertDag,
  composeNodeInput,
  DagValidationError,
  topologicalWaves,
  type OrchestrationGraph,
} from "./orchestration.js";

function graph(overrides: Partial<OrchestrationGraph> = {}): OrchestrationGraph {
  return {
    nodes: [
      { id: "a", agentId: "00000000-0000-4000-8000-000000000001", position: { x: 0, y: 0 } },
      { id: "b", agentId: "00000000-0000-4000-8000-000000000002", position: { x: 100, y: 0 } },
    ],
    edges: [{ id: "e1", source: "a", target: "b" }],
    ...overrides,
  };
}

describe("assertDag", () => {
  it("accepts a valid DAG", () => {
    expect(() => assertDag(graph())).not.toThrow();
  });

  it("rejects empty graphs", () => {
    expect(() => assertDag({ nodes: [], edges: [] })).toThrow(DagValidationError);
  });

  it("rejects duplicate node ids", () => {
    const g = graph({
      nodes: [
        { id: "a", agentId: "00000000-0000-4000-8000-000000000001", position: { x: 0, y: 0 } },
        { id: "a", agentId: "00000000-0000-4000-8000-000000000002", position: { x: 1, y: 0 } },
      ],
      edges: [],
    });
    expect(() => assertDag(g)).toThrow(/Duplicate node id/);
  });

  it("rejects edges that reference missing nodes", () => {
    const g = graph({
      edges: [{ id: "e1", source: "a", target: "missing" }],
    });
    expect(() => assertDag(g)).toThrow(/target not found/);
  });

  it("rejects cycles", () => {
    const g = graph({
      edges: [
        { id: "e1", source: "a", target: "b" },
        { id: "e2", source: "b", target: "a" },
      ],
    });
    expect(() => assertDag(g)).toThrow(/cycle/);
  });
});

describe("topologicalWaves", () => {
  it("orders a linear chain into sequential waves", () => {
    expect(topologicalWaves(graph())).toEqual([["a"], ["b"]]);
  });

  it("groups parallel entry nodes in one wave", () => {
    const g: OrchestrationGraph = {
      nodes: [
        { id: "a", agentId: "00000000-0000-4000-8000-000000000001", position: { x: 0, y: 0 } },
        { id: "b", agentId: "00000000-0000-4000-8000-000000000002", position: { x: 0, y: 100 } },
        { id: "c", agentId: "00000000-0000-4000-8000-000000000003", position: { x: 100, y: 50 } },
      ],
      edges: [
        { id: "e1", source: "a", target: "c" },
        { id: "e2", source: "b", target: "c" },
      ],
    };

    expect(topologicalWaves(g)).toEqual([
      ["a", "b"],
      ["c"],
    ]);
  });

  it("treats isolated nodes as parallel entry points", () => {
    const g: OrchestrationGraph = {
      nodes: [
        { id: "a", agentId: "00000000-0000-4000-8000-000000000001", position: { x: 0, y: 0 } },
        { id: "b", agentId: "00000000-0000-4000-8000-000000000002", position: { x: 100, y: 0 } },
      ],
      edges: [],
    };

    expect(topologicalWaves(g)).toEqual([["a", "b"]]);
  });
});

describe("composeNodeInput", () => {
  it("returns the original message when there are no dependencies", () => {
    expect(composeNodeInput("Hello", [])).toBe("Hello");
  });

  it("appends labeled upstream outputs", () => {
    const result = composeNodeInput("Start", [
      {
        nodeId: "a",
        agentId: "00000000-0000-4000-8000-000000000001",
        output: "First reply",
      },
    ]);

    expect(result).toContain("Start");
    expect(result).toContain("--- Output from node a");
    expect(result).toContain("First reply");
  });
});
