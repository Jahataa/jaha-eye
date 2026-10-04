import { z } from "zod";

export const ApiKeySourceSchema = z.enum(["settings", "env", "none"]);
export type ApiKeySource = z.infer<typeof ApiKeySourceSchema>;

export const BaseUrlSourceSchema = z.enum(["settings", "env", "none"]);
export type BaseUrlSource = z.infer<typeof BaseUrlSourceSchema>;

export const LlmSettingsSchema = z.object({
  hasApiKey: z.boolean(),
  apiKeySource: ApiKeySourceSchema,
  baseUrl: z.string().nullable(),
  baseUrlSource: BaseUrlSourceSchema,
  defaultModelName: z.string(),
  defaultTemperature: z.number().min(0).max(2),
});

export type LlmSettings = z.infer<typeof LlmSettingsSchema>;

export const UpdateLlmSettingsSchema = z.object({
  apiKey: z.string().min(1).optional().nullable(),
  baseUrl: z.string().url().optional().nullable(),
  defaultModelName: z.string().min(1).optional(),
  defaultTemperature: z.number().min(0).max(2).optional(),
});

export type UpdateLlmSettingsInput = z.infer<typeof UpdateLlmSettingsSchema>;

export const TestLlmSettingsSchema = z.object({
  apiKey: z.string().min(1).optional(),
  baseUrl: z.string().url().optional(),
});

export type TestLlmSettingsInput = z.infer<typeof TestLlmSettingsSchema>;

export const LlmModelSchema = z.object({
  id: z.string(),
});

export type LlmModel = z.infer<typeof LlmModelSchema>;

export const LlmModelsSchema = z.object({
  ok: z.boolean(),
  models: z.array(LlmModelSchema).optional(),
  error: z.string().optional(),
});

export type LlmModelsResponse = z.infer<typeof LlmModelsSchema>;
