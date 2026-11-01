import { useEffect, useState } from "react";
import type { LlmModel } from "@jaha-eye/shared";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card } from "../../components/ui/card";
import { useSettings, useTestSettings, useUpdateSettings } from "./queries";
import { DocHelp } from "../docs/DocHelp";

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const testMutation = useTestSettings();

  const [baseUrl, setBaseUrl] = useState("");
  const [defaultModelName, setDefaultModelName] = useState("gpt-4o-mini");
  const [defaultTemperature, setDefaultTemperature] = useState("0.7");
  const [usageBudgetTokens, setUsageBudgetTokens] = useState("");
  const [availableModels, setAvailableModels] = useState<LlmModel[]>([]);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setBaseUrl(settings.baseUrl ?? "");
      setDefaultModelName(settings.defaultModelName);
      setDefaultTemperature(String(settings.defaultTemperature));
      setUsageBudgetTokens(
        settings.usageBudgetTokens != null ? String(settings.usageBudgetTokens) : "",
      );
    }
  }, [settings]);

  useEffect(() => {
    if (!saveFeedback) return;
    const timer = setTimeout(() => setSaveFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [saveFeedback]);

  useEffect(() => {
    if (!testFeedback) return;
    const timer = setTimeout(() => setTestFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [testFeedback]);

  function buildOverrides() {
    const overrides: { baseUrl?: string } = {};
    if (baseUrl.trim()) overrides.baseUrl = baseUrl.trim();
    return overrides;
  }

  async function handleTest() {
    setTestFeedback(null);
    try {
      const result = await testMutation.mutateAsync(buildOverrides());
      if (result.ok && result.models) {
        setAvailableModels(result.models);
        setTestFeedback(`Connected — ${result.models.length} model(s) found.`);
      } else {
        setTestFeedback(result.error ?? "Connection failed.");
      }
    } catch (error) {
      setTestFeedback(error instanceof Error ? error.message : "Connection failed.");
    }
  }

  async function handleSave() {
    setSaveFeedback(null);
    try {
      const budgetTrimmed = usageBudgetTokens.trim();
      const payload = {
        defaultModelName,
        defaultTemperature: Number(defaultTemperature),
        baseUrl: baseUrl.trim() ? baseUrl.trim() : null,
        usageBudgetTokens: budgetTrimmed ? Number(budgetTrimmed) : null,
      };

      await updateMutation.mutateAsync(payload);
      setSaveFeedback("Settings saved.");
    } catch (error) {
      setSaveFeedback(error instanceof Error ? error.message : "Save failed.");
    }
  }

  if (isLoading) {
    return <p className="text-muted">Loading settings…</p>;
  }

  const apiKeyStatus = settings?.hasApiKey
    ? "Configured via OPENAI_API_KEY in the environment."
    : "Not set — add OPENAI_API_KEY to .env and restart the API.";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="hud-kicker text-base text-foreground">Settings</h1>
        <DocHelp feature="settingsModels" />
        <DocHelp feature="settingsEnvironment" />
      </div>

      <Card className="space-y-4">
        <div>
          <Label>LLM provider</Label>
          <Input value="OpenAI-compatible" disabled />
          <p className="mt-1 text-xs text-muted">
            Supports OpenAI, Ollama, LiteLLM, and other compatible endpoints.
          </p>
        </div>

        <div>
          <Label>Base URL</Label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:11434/v1"
          />
          {settings?.baseUrlSource === "env" && !baseUrl && (
            <p className="mt-1 text-xs text-muted">Currently using value from environment.</p>
          )}
        </div>

        <div>
          <Label>API key</Label>
          <p className="mt-1 text-sm text-foreground">{apiKeyStatus}</p>
          <p className="mt-1 text-xs text-muted">
            Keys are read from the server environment only and are not stored in the database.
          </p>
        </div>

        <div>
          <Label>Default model</Label>
          {availableModels.length > 0 ? (
            <select
              className="hud-mono mt-1 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent/60"
              value={defaultModelName}
              onChange={(e) => setDefaultModelName(e.target.value)}
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={defaultModelName}
              onChange={(e) => setDefaultModelName(e.target.value)}
              placeholder="gpt-4o-mini"
            />
          )}
          <p className="mt-1 text-xs text-muted">
            Used when creating new agents. Test connection to pick from available models.
          </p>
        </div>

        <div>
          <Label>Default temperature</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={defaultTemperature}
            onChange={(e) => setDefaultTemperature(e.target.value)}
          />
        </div>

        <div>
          <Label>Office usage budget (tokens, rolling 24h)</Label>
          <Input
            type="number"
            min="1"
            value={usageBudgetTokens}
            onChange={(e) => setUsageBudgetTokens(e.target.value)}
            placeholder="Optional — powers Office usage gauge"
          />
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex gap-2">
            <Button onClick={handleTest} disabled={testMutation.isPending} variant="outline">
              {testMutation.isPending ? "Testing…" : "Test connection"}
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
          {testFeedback && (
            <p
              className={
                testFeedback.startsWith("Connected")
                  ? "hud-mono text-sm text-success"
                  : "text-sm text-danger"
              }
            >
              {testFeedback}
            </p>
          )}
          {saveFeedback && (
            <p
              className={
                saveFeedback === "Settings saved."
                  ? "hud-mono text-sm text-success"
                  : "text-sm text-danger"
              }
            >
              {saveFeedback}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
