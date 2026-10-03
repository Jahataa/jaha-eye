import { describe, expect, it } from "vitest";
import { ROLE_PRESETS } from "@jaha-eye/shared";
import { resolveTools } from "./registry.js";

describe("resolveTools", () => {
  it("resolves all tools for the general preset", () => {
    const preset = ROLE_PRESETS.find((p) => p.id === "general")!;
    const tools = resolveTools(preset.tools);
    expect(tools).toHaveLength(preset.tools.length);
  });

  it("resolves all tools for the researcher preset", () => {
    const preset = ROLE_PRESETS.find((p) => p.id === "researcher")!;
    const tools = resolveTools(preset.tools);
    expect(tools).toHaveLength(preset.tools.length);
  });

  it("skips unknown tool ids", () => {
    const tools = resolveTools(["current_time", "unknown_tool"]);
    expect(tools).toHaveLength(1);
  });
});
