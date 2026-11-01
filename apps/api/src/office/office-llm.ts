import { completeJson } from "@jaha-eye/agent-core";
import { officeRouterModel } from "../lib/office-config.js";
import { getDefaultModelDefaults, getEffectiveLlmConfig } from "../services/settings-service.js";

export async function officeCompleteJson<T extends Record<string, unknown>>(
  input: Omit<Parameters<typeof completeJson<T>>[0], "config"> & {
    model?: string;
    temperature?: number;
  },
): Promise<T> {
  const config = await getEffectiveLlmConfig();
  const defaults = await getDefaultModelDefaults();
  const apiKey = config.openaiApiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No LLM API key configured");
  }

  return completeJson({
    ...input,
    config: {
      apiKey,
      baseUrl: config.openaiBaseUrl,
      model: input.model ?? officeRouterModel() ?? defaults.defaultModelName,
      temperature: input.temperature ?? 0,
    },
  });
}
