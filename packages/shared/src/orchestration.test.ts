import { describe, expect, it } from "vitest";
import {
  assertDag,
  buildNodeMessage,
  composeNodeInput,
  DagValidationError,
  MissingTemplateVariableError,
  resolveEntryNodeMessage,
  resolveInputTemplate,
  resolveNodeSystemPrompt,
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
  it("returns empty string when there are no dependencies", () => {
    expect(composeNodeInput([])).toBe("");
  });

  it("joins upstream assistant replies with blank lines", () => {
    const result = composeNodeInput([
      {
        nodeId: "a",
        agentId: "00000000-0000-4000-8000-000000000001",
        output: "First reply",
      },
      {
        nodeId: "b",
        agentId: "00000000-0000-4000-8000-000000000002",
        output: "Second reply",
      },
    ]);

    expect(result).toBe("First reply\n\nSecond reply");
    expect(result).not.toContain("--- Output from node");
  });
});

describe("resolveInputTemplate", () => {
  it("replaces ${VarName} placeholders", () => {
    expect(
      resolveInputTemplate("What time is currently in ${City}?", { City: "London" }),
    ).toBe("What time is currently in London?");
  });

  it("throws when a referenced variable is missing", () => {
    expect(() => resolveInputTemplate("Hello ${Missing}", {})).toThrow(MissingTemplateVariableError);
    expect(() => resolveInputTemplate("Hello ${Missing}", {})).toThrow(
      'Variable "Missing" is not set',
    );
  });
});

describe("resolveEntryNodeMessage", () => {
  it("prefers orchestration input over agent default", () => {
    expect(resolveEntryNodeMessage("Orchestration msg", "Agent default")).toBe("Orchestration msg");
  });

  it("falls back to agent default when orchestration input is empty", () => {
    expect(resolveEntryNodeMessage("", "Agent default")).toBe("Agent default");
  });

  it("falls back to Hello when both are empty", () => {
    expect(resolveEntryNodeMessage("", null)).toBe("Hello");
  });
});

describe("buildNodeMessage", () => {
  const g = graph({
    nodes: [
      {
        id: "country",
        agentId: "00000000-0000-4000-8000-000000000001",
        position: { x: 0, y: 0 },
        outputVariable: "City",
      },
      {
        id: "time",
        agentId: "00000000-0000-4000-8000-000000000002",
        position: { x: 100, y: 0 },
        inputTemplate: "What time is currently in ${City}?",
      },
    ],
    edges: [{ id: "e1", source: "country", target: "time" }],
  });

  it("uses entry fallback for entry nodes without a template", () => {
    const country = g.nodes[0]!;
    const message = buildNodeMessage(country, g, {
      orchestrationInput: "",
      agentDefaultRunInput: "What is the capital of England?",
      variables: {},
      nodeOutputs: new Map(),
    });
    expect(message).toBe("What is the capital of England?");
  });

  it("uses inputTemplate with variables for downstream nodes", () => {
    const time = g.nodes[1]!;
    const message = buildNodeMessage(time, g, {
      orchestrationInput: "",
      agentDefaultRunInput: null,
      variables: { City: "London" },
      nodeOutputs: new Map([["country", "London"]]),
    });
    expect(message).toBe("What time is currently in London?");
  });

  it("joins upstream replies when downstream has no template", () => {
    const downstreamGraph = graph({
      nodes: [
        { id: "a", agentId: "00000000-0000-4000-8000-000000000001", position: { x: 0, y: 0 } },
        { id: "b", agentId: "00000000-0000-4000-8000-000000000002", position: { x: 100, y: 0 } },
      ],
      edges: [{ id: "e1", source: "a", target: "b" }],
    });
    const downstream = downstreamGraph.nodes[1]!;
    const message = buildNodeMessage(downstream, downstreamGraph, {
      orchestrationInput: "ignored",
      agentDefaultRunInput: null,
      variables: {},
      nodeOutputs: new Map([["a", "First"]]),
    });
    expect(message).toBe("First");
  });
});

describe("resolveNodeSystemPrompt", () => {
  it("uses agent default when node override is empty", () => {
    expect(
      resolveNodeSystemPrompt({ systemPrompt: null }, "Agent default prompt"),
    ).toBe("Agent default prompt");
  });

  it("uses node override when set", () => {
    expect(
      resolveNodeSystemPrompt(
        { systemPrompt: "Orchestration-only prompt" },
        "Agent default prompt",
      ),
    ).toBe("Orchestration-only prompt");
  });
});
