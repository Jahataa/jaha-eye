import { registerPromptComposer, registerRunSettledListener } from "../services/run-hooks.js";
import { composeOfficePrompt } from "./office-prompt-composer.js";
import { handleOfficeRunSettled } from "./office-task-service.js";
import { recordRunUsage } from "./office-usage.js";

export function registerOfficeHooks(): void {
  registerPromptComposer((definition, ctx) => composeOfficePrompt(definition, ctx));

  registerRunSettledListener(async (runId) => {
    await handleOfficeRunSettled(runId);
  });

  registerRunSettledListener(async (runId) => {
    try {
      await recordRunUsage(runId);
    } catch {
      // usage recording must not fail runs
    }
  });
}
