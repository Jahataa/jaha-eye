import { z } from "zod";
import { modelBaseUrlRefinement } from "./model-url-policy.js";

export const ApiKeySourceSchema = z.enum(["env", "none"]);
export type ApiKeySource = z.infer<typeof ApiKeySourceSchema>;

export const BaseUrlSourceSchema = z.enum(["settings", "env", "none"]);
export type BaseUrlSource = z.infer<typeof BaseUrlSourceSchema>;

const optionalModelBaseUrl = z
  .string()
  .url()
  .optional()
  .nullable()
  .superRefine((value, ctx) => {
    if (value == null || value === "") return;
    modelBaseUrlRefinement(value, ctx);
  });

export const LlmSettingsSchema = z.object({
  hasApiKey: z.boolean(),
  apiKeySource: ApiKeySourceSchema,
  baseUrl: z.string().nullable(),
  baseUrlSource: BaseUrlSourceSchema,
  defaultModelName: z.string(),
  defaultTemperature: z.number().min(0).max(2),
  usageBudgetTokens: z.number().int().positive().nullable().optional(),
});

export type LlmSettings = z.infer<typeof LlmSettingsSchema>;

export const UpdateLlmSettingsSchema = z.object({
  baseUrl: optionalModelBaseUrl,
  defaultModelName: z.string().min(1).optional(),
  defaultTemperature: z.number().min(0).max(2).optional(),
  usageBudgetTokens: z.number().int().positive().nullable().optional(),
});

export type UpdateLlmSettingsInput = z.infer<typeof UpdateLlmSettingsSchema>;

export const TestLlmSettingsSchema = z.object({
  baseUrl: z
    .string()
    .url()
    .optional()
    .superRefine((value, ctx) => {
      if (value == null || value === "") return;
      modelBaseUrlRefinement(value, ctx);
    }),
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
