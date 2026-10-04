import { prisma } from "@jaha-eye/database";
import type {
  LlmModelsResponse,
  LlmSettings,
  TestLlmSettingsInput,
  UpdateLlmSettingsInput,
} from "@jaha-eye/shared";

const SETTINGS_ID = "default";

export interface EffectiveLlmConfig {
  openaiApiKey?: string;
  openaiBaseUrl?: string;
}

async function getSettingsRow() {
  return prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } });
}

export async function getEffectiveLlmConfig(): Promise<EffectiveLlmConfig> {
  const row = await getSettingsRow();
  const apiKey = row?.llmApiKey ?? process.env.OPENAI_API_KEY;
  const baseUrl = row?.llmBaseUrl ?? process.env.OPENAI_BASE_URL;

  return {
    openaiApiKey: apiKey || undefined,
    openaiBaseUrl: baseUrl || undefined,
  };
}

export async function getDefaultModelDefaults(): Promise<{
  defaultModelName: string;
  defaultTemperature: number;
}> {
  const row = await getSettingsRow();
  return {
    defaultModelName: row?.defaultModelName ?? "gpt-4o-mini",
    defaultTemperature: row?.defaultTemperature ?? 0.7,
  };
}

export async function getPublicSettings(): Promise<LlmSettings> {
  const row = await getSettingsRow();
  const envKey = process.env.OPENAI_API_KEY;
  const envBaseUrl = process.env.OPENAI_BASE_URL;

  let hasApiKey = false;
  let apiKeySource: LlmSettings["apiKeySource"] = "none";

  if (row?.llmApiKey) {
    hasApiKey = true;
    apiKeySource = "settings";
  } else if (envKey) {
    hasApiKey = true;
    apiKeySource = "env";
  }

  let baseUrl: string | null = null;
  let baseUrlSource: LlmSettings["baseUrlSource"] = "none";

  if (row?.llmBaseUrl) {
    baseUrl = row.llmBaseUrl;
    baseUrlSource = "settings";
  } else if (envBaseUrl) {
    baseUrl = envBaseUrl;
    baseUrlSource = "env";
  }

  return {
    hasApiKey,
    apiKeySource,
    baseUrl,
    baseUrlSource,
    defaultModelName: row?.defaultModelName ?? "gpt-4o-mini",
    defaultTemperature: row?.defaultTemperature ?? 0.7,
  };
}

export async function upsertSettings(input: UpdateLlmSettingsInput): Promise<LlmSettings> {
  const existing = await getSettingsRow();
  const data: {
    llmApiKey?: string | null;
    llmBaseUrl?: string | null;
    defaultModelName?: string;
    defaultTemperature?: number;
  } = {};

  if (input.apiKey !== undefined) {
    data.llmApiKey = input.apiKey;
  }
  if (input.baseUrl !== undefined) {
    data.llmBaseUrl = input.baseUrl;
  }
  if (input.defaultModelName !== undefined) {
    data.defaultModelName = input.defaultModelName;
  }
  if (input.defaultTemperature !== undefined) {
    data.defaultTemperature = input.defaultTemperature;
  }

  if (existing) {
    await prisma.appSettings.update({ where: { id: SETTINGS_ID }, data });
  } else {
    await prisma.appSettings.create({
      data: {
        id: SETTINGS_ID,
        defaultModelName: input.defaultModelName ?? "gpt-4o-mini",
        defaultTemperature: input.defaultTemperature ?? 0.7,
        ...data,
      },
    });
  }

  return getPublicSettings();
}

export async function testConnection(
  overrides?: TestLlmSettingsInput,
): Promise<LlmModelsResponse> {
  const row = await getSettingsRow();
  const apiKey =
    overrides?.apiKey ?? row?.llmApiKey ?? process.env.OPENAI_API_KEY ?? undefined;
  const baseUrl =
    overrides?.baseUrl ?? row?.llmBaseUrl ?? process.env.OPENAI_BASE_URL ?? undefined;

  if (!apiKey) {
    return { ok: false, error: "No API key configured" };
  }

  const url = baseUrl
    ? `${baseUrl.replace(/\/$/, "")}/models`
    : "https://api.openai.com/v1/models";

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
      };
    }

    const json = (await res.json()) as { data?: Array<{ id?: string }> };
    const models = (json.data ?? [])
      .filter((m): m is { id: string } => typeof m.id === "string")
      .map((m) => ({ id: m.id }));

    return { ok: true, models };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return { ok: false, error: message };
  }
}
