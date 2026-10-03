import { Agent } from "@strands-agents/sdk";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";
import { StrandsAgent } from "@ag-ui/aws-strands";
import type { AgentDefinition } from "@jaha-eye/shared";
import { resolveTools } from "../tools/registry.js";

export interface AgentFactoryConfig {
  openaiApiKey?: string;
  openaiBaseUrl?: string;
}

export class AgentFactory {
  constructor(private readonly config: AgentFactoryConfig) {}

  createStrandsAgent(definition: AgentDefinition, agentsByThread: Map<string, Agent>) {
    const baseUrl = definition.modelBaseUrl ?? this.config.openaiBaseUrl;
    const apiKey = this.config.openaiApiKey ?? process.env.OPENAI_API_KEY ?? "not-set";

    const model = new OpenAIModel({
      modelId: definition.modelName,
      apiKey,
      temperature: definition.modelTemperature,
      clientConfig: baseUrl ? { baseURL: baseUrl } : undefined,
    });

    const tools = resolveTools(definition.tools);

    const agent = new Agent({
      model,
      systemPrompt: definition.systemPrompt,
      tools,
      printer: false,
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
