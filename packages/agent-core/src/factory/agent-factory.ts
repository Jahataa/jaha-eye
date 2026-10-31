import { Agent } from "@strands-agents/sdk";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";
import { StrandsAgent } from "@ag-ui/aws-strands";
import { assertModelBaseUrlAllowed, type AgentDefinition } from "@jaha-eye/shared";
import { resolveTools } from "../tools/registry.js";

export interface AgentFactoryConfig {
  resolveLlmDefaults: () => Promise<{ openaiApiKey?: string; openaiBaseUrl?: string }>;
}

export class AgentFactory {
  constructor(private readonly config: AgentFactoryConfig) {}

  async createStrandsAgent(definition: AgentDefinition, agentsByThread: Map<string, Agent>) {
    const defaults = await this.config.resolveLlmDefaults();
    const baseUrl = definition.modelBaseUrl ?? defaults.openaiBaseUrl;
    if (baseUrl) {
      assertModelBaseUrlAllowed(baseUrl);
    }
    const apiKey = defaults.openaiApiKey ?? process.env.OPENAI_API_KEY ?? "not-set";

    const model = new OpenAIModel({
      modelId: definition.modelName,
      apiKey,
      temperature: definition.modelTemperature,
      clientConfig: baseUrl ? { baseURL: baseUrl } : undefined,
      ...(definition.modelContextWindowLimit != null
        ? { contextWindowLimit: definition.modelContextWindowLimit }
        : {}),
      ...(definition.modelMaxTokens != null ? { maxTokens: definition.modelMaxTokens } : {}),
    });

    const tools = resolveTools(definition.tools);

    const agent = new Agent({
      model,
      systemPrompt: definition.systemPrompt,
      tools,
      printer: false,
      ...(definition.modelContextWindowLimit != null ? { contextManager: "auto" as const } : {}),
    });

    const strandsAgent = new StrandsAgent({
      agent,
      name: definition.name,
      description: definition.description ?? definition.name,
      agentsByThread,
    });

    return { agent, strandsAgent };
  }
}
