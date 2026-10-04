import { describe, expect, it } from "vitest";
import { resolveDefaultRunInput } from "./agent.js";

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
