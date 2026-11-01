import { describe, expect, it } from "vitest";
import { replyFromRunOutput } from "./office-run-reply.js";

describe("replyFromRunOutput", () => {
  it("reads orchestration parent sink replies", () => {
    const text = replyFromRunOutput({
      replies: [{ nodeId: "lead-synth", agentId: "a", output: "Final team answer" }],
    });
    expect(text).toBe("Final team answer");
  });
});
