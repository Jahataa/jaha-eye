import { describe, expect, it } from "vitest";
import { parseDatabaseSnapshot } from "./graphify-parse.js";

describe("parseDatabaseSnapshot", () => {
  it("extracts tables and foreign keys from graphify postgres nodes", () => {
    const graph = {
      nodes: [
        { id: "postgresql_localhost_jaha_eye", label: "jaha_eye" },
        { id: "postgresql_localhost_jaha_eye_public_agents", label: '"public"."agents"' },
        { id: "postgresql_localhost_jaha_eye_public_agent_runs", label: '"public"."agent_runs"' },
        {
          id: "postgresql_localhost_jaha_eye_public_agent_run_events",
          label: '"public"."agent_run_events"',
        },
        {
          id: "postgresql_localhost_jaha_eye_public_prisma_migrations",
          label: '"public"."_prisma_migrations"',
        },
      ],
      edges: [
        {
          source: "postgresql_localhost_jaha_eye_public_agent_runs",
          target: "postgresql_localhost_jaha_eye_public_agents",
          relation: "references",
        },
        {
          source: "postgresql_localhost_jaha_eye_public_agent_run_events",
          target: "postgresql_localhost_jaha_eye_public_agent_runs",
          relation: "references",
        },
        {
          source: "postgresql_localhost_jaha_eye_public_agent_runs",
          target: "postgresql_localhost_jaha_eye_public_agent_runs",
          relation: "references",
        },
      ],
    };

    const snapshot = parseDatabaseSnapshot(graph);
    expect(snapshot?.databaseName).toBe("jaha_eye");
    expect(snapshot?.tables.map((t) => t.name)).toEqual([
      "agent_run_events",
      "agent_runs",
      "agents",
    ]);
    expect(snapshot?.foreignKeys).toEqual([
      { fromTable: "agent_runs", toTable: "agents", relation: "references" },
      { fromTable: "agent_run_events", toTable: "agent_runs", relation: "references" },
    ]);
  });
});
