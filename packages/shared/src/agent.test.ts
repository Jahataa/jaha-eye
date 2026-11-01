import { describe, expect, it } from "vitest";
import { CreateAgentSchema, resolveDefaultRunInput, UpdateAgentSchema } from "./agent.js";

describe("AgentDepartmentSchema via CreateAgentSchema", () => {
  const base = {
    name: "Ops",
    slug: "ops",
  };

  it("accepts department and trims whitespace", () => {
    const parsed = CreateAgentSchema.parse({ ...base, department: "  Research  " });
    expect(parsed.department).toBe("Research");
  });

  it("normalizes empty string to null", () => {
    const parsed = CreateAgentSchema.parse({ ...base, department: "   " });
    expect(parsed.department).toBeNull();
  });

  it("rejects department longer than 40 characters", () => {
    const result = CreateAgentSchema.safeParse({ ...base, department: "x".repeat(41) });
    expect(result.success).toBe(false);
  });

  it("allows partial department update", () => {
    const parsed = UpdateAgentSchema.parse({ department: "Sales" });
    expect(parsed.department).toBe("Sales");
  });
});

describe("resolveDefaultRunInput", () => {
  it("uses defaultRunInput when set", () => {
    expect(resolveDefaultRunInput({ defaultRunInput: "What is the capital of Bulgaria?" })).toBe(
      "What is the capital of Bulgaria?",
    );
  });

  it("trims whitespace", () => {
    expect(resolveDefaultRunInput({ defaultRunInput: "  Hello  " })).toBe("Hello");
  });

  it("falls back when empty", () => {
    expect(resolveDefaultRunInput({ defaultRunInput: "" })).toBe("Hello");
    expect(resolveDefaultRunInput({ defaultRunInput: null })).toBe("Hello");
    expect(resolveDefaultRunInput({})).toBe("Hello");
  });
});
