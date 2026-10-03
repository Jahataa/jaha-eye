import { describe, expect, it } from "vitest";
import { normalizeAgUiEvent, summarizeActivity } from "./normalizer.js";

describe("normalizeAgUiEvent", () => {
  it("maps RUN_STARTED to persisted shape", () => {
    const result = normalizeAgUiEvent({
      type: "RUN_STARTED",
      timestamp: 1_700_000_000_000,
      threadId: "run-1",
      runId: "run-1",
    });

    expect(result.type).toBe("RUN_STARTED");
    expect(result.timestamp).toEqual(new Date(1_700_000_000_000));
    expect(result.payload.type).toBe("RUN_STARTED");
    expect(result.payload.threadId).toBe("run-1");
  });

  it("maps TOOL_CALL_START with tool name", () => {
    const result = normalizeAgUiEvent({
      type: "TOOL_CALL_START",
      timestamp: Date.now(),
      toolCallId: "tc-1",
      toolCallName: "current_time",
      parentMessageId: "msg-1",
    });

    expect(result.type).toBe("TOOL_CALL_START");
    expect(result.payload.toolCallName).toBe("current_time");
  });

  it("summarizes activity for tool calls", () => {
    const event = normalizeAgUiEvent({
      type: "TOOL_CALL_START",
      timestamp: Date.now(),
      toolCallId: "tc-1",
      toolCallName: "current_time",
      parentMessageId: "msg-1",
    });

    expect(summarizeActivity(event)).toBe("Calling tool current_time…");
  });
});
