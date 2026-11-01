import { assertModelBaseUrlAllowed } from "@jaha-eye/shared";

export type CompleteJsonConfig = {
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  timeoutMs?: number;
};

export type JsonSchema<T> = {
  parse: (value: unknown) => T;
};

export type CompleteJsonInput<T> = {
  system: string;
  user: string;
  schema: JsonSchema<T>;
  config: CompleteJsonConfig;
};

function chatCompletionsUrl(baseUrl: string | undefined): string {
  const trimmed = baseUrl?.replace(/\/$/, "") ?? "https://api.openai.com/v1";
  return `${trimmed}/chat/completions`;
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export async function completeJson<T extends Record<string, unknown>>(
  input: CompleteJsonInput<T>,
): Promise<T> {
  const { config, system, user, schema } = input;
  if (config.baseUrl) {
    assertModelBaseUrlAllowed(config.baseUrl);
  }

  const controller = new AbortController();
  const timeoutMs = config.timeoutMs ?? 60_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(chatCompletionsUrl(config.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature ?? 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`LLM request failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(extractJsonObject(content)) as unknown;
    return schema.parse(parsed);
  } finally {
    clearTimeout(timer);
  }
}
