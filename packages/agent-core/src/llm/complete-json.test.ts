import { describe, expect, it, vi, afterEach } from "vitest";
import { z } from "zod";
import { completeJson } from "./complete-json.js";

describe("completeJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses JSON object from chat completion content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"agent":"a1","title":"T"}' } }],
        }),
      })),
    );

    const schema = z.object({ agent: z.string(), title: z.string() });
    const result = await completeJson({
      system: "sys",
      user: "usr",
      schema: { parse: (value) => schema.parse(value) },
      config: { apiKey: "test-key", model: "gpt-4o-mini" },
    });

    expect(result).toEqual({ agent: "a1", title: "T" });
  });
});
