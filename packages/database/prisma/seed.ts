import { PrismaClient } from "@prisma/client";
import { ROLE_PRESETS } from "@jaha-eye/shared";

const prisma = new PrismaClient();

async function main() {
  for (const preset of ROLE_PRESETS) {
    await prisma.agent.upsert({
      where: { slug: preset.suggestedSlug },
      create: {
        name: preset.name,
        slug: preset.suggestedSlug,
        description: preset.description,
        systemPrompt: preset.systemPrompt,
        tools: preset.tools,
        defaultRunInput: preset.defaultRunInput,
        modelProvider: "openai",
        modelName: "gpt-4o-mini",
      },
      update: {
        name: preset.name,
        description: preset.description,
        systemPrompt: preset.systemPrompt,
        tools: preset.tools,
        defaultRunInput: preset.defaultRunInput,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
