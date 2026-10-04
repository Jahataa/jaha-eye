import { describe, expect, it } from "vitest";
import { extractAssistantReply, formatToolCallResult } from "./event.js";
import type { PersistedAgentEvent } from "./event.js";

function event(type: string, payload: Record<string, unknown>, sequence: number): PersistedAgentEvent {
  return {
    id: `${sequence}`,
    runId: "run-1",
    sequence,
    type,
    timestamp: new Date(),
    payload,
  };
}

describe("extractAssistantReply", () => {
  it("reads the last assistant message from MESSAGES_SNAPSHOT", () => {
    const events = [
      event("MESSAGES_SNAPSHOT", {
        messages: [
          { role: "user", content: "Hi" },
          { role: "assistant", content: "Hello there" },
        ],
      }, 1),
    ];

    expect(extractAssistantReply(events)).toBe("Hello there");
  });

  it("falls back to TEXT_MESSAGE_CONTENT deltas", () => {
    const events = [
      event("TEXT_MESSAGE_CONTENT", { messageId: "m1", delta: "The time is " }, 1),
      event("TEXT_MESSAGE_CONTENT", { messageId: "m1", delta: "now." }, 2),
    ];

    expect(extractAssistantReply(events)).toBe("The time is now.");
  });
});

describe("formatToolCallResult", () => {
  it("pretty-prints JSON tool content", () => {
    const formatted = formatToolCallResult({
      content: '{"isoUtc":"2026-10-04T08:00:00.000Z"}',
    });

    expect(formatted).toContain("isoUtc");
    expect(formatted).toContain("2026-10-04");
  });
});
