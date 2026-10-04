import { useEffect, useState } from "react";
import type { LlmModel } from "@jaha-eye/shared";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card } from "../../components/ui/card";
import { useSettings, useTestSettings, useUpdateSettings } from "./queries";

export function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useUpdateSettings();
  const testMutation = useTestSettings();

  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [defaultModelName, setDefaultModelName] = useState("gpt-4o-mini");
  const [defaultTemperature, setDefaultTemperature] = useState("0.7");
  const [availableModels, setAvailableModels] = useState<LlmModel[]>([]);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setBaseUrl(settings.baseUrl ?? "");
      setDefaultModelName(settings.defaultModelName);
      setDefaultTemperature(String(settings.defaultTemperature));
      setApiKey("");
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
    const overrides: { apiKey?: string; baseUrl?: string } = {};
    if (apiKey.trim()) overrides.apiKey = apiKey.trim();
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
      const payload: {
        apiKey?: string | null;
        baseUrl?: string | null;
        defaultModelName: string;
        defaultTemperature: number;
      } = {
        defaultModelName,
        defaultTemperature: Number(defaultTemperature),
      };

      if (apiKey.trim()) {
        payload.apiKey = apiKey.trim();
      } else if (apiKey === "" && settings?.apiKeySource === "settings") {
        // Operator cleared the field — no action unless they explicitly want to clear
      }

      if (baseUrl.trim()) {
        payload.baseUrl = baseUrl.trim();
      } else {
        payload.baseUrl = null;
      }

      await updateMutation.mutateAsync(payload);
      setApiKey("");
      setSaveFeedback("Settings saved.");
    } catch (error) {
      setSaveFeedback(error instanceof Error ? error.message : "Save failed.");
    }
  }

  if (isLoading) {
    return <p className="text-muted">Loading settings…</p>;
  }

  const apiKeyPlaceholder = settings?.hasApiKey
    ? settings.apiKeySource === "settings"
      ? "•••••••• (saved in Settings)"
      : "•••••••• (from environment)"
    : "Enter API key";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="hud-kicker text-base text-foreground">Settings</h1>

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
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={apiKeyPlaceholder}
            autoComplete="off"
          />
          {settings?.hasApiKey && !apiKey && (
            <p className="mt-1 text-xs text-muted">
              Key configured via {settings.apiKeySource}. Leave blank to keep current key.
            </p>
          )}
          {settings?.apiKeySource === "settings" && (
            <button
              type="button"
              className="mt-1 text-xs text-accent underline"
              onClick={async () => {
                setSaveFeedback(null);
                try {
                  await updateMutation.mutateAsync({ apiKey: null });
                  setApiKey("");
                  setSaveFeedback("Saved key cleared; using environment fallback.");
                } catch (error) {
                  setSaveFeedback(error instanceof Error ? error.message : "Clear failed.");
                }
              }}
            >
              Clear saved key (use environment)
            </button>
          )}
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
