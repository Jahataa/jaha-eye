import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import type { BuiltinTool, RolePreset } from "@jaha-eye/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Card } from "../../components/ui/card";
import { ToolCard } from "../../components/tools/ToolCard";

const BLANK_DEFAULTS = {
  name: "",
  slug: "",
  description: "",
  modelName: "gpt-4o-mini",
  modelBaseUrl: "",
  modelTemperature: "0.7",
  modelProvider: "openai",
  systemPrompt: "You are a helpful assistant.",
  selectedTools: [] as string[],
  defaultRunInput: "",
  maxConcurrentRuns: "1",
};

function groupTools(tools: BuiltinTool[]) {
  const safe = tools.filter((t) => t.risk === "safe");
  const network = tools.filter((t) => t.risk === "network");
  return { safe, network };
}

export function AgentEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: agent } = useQuery({
    queryKey: ["agents", id],
    queryFn: () => api.getAgent(id!),
    enabled: !isNew,
  });

  const { data: tools = [] } = useQuery({ queryKey: ["tools"], queryFn: api.getTools });
  const { data: rolePresets = [] } = useQuery({
    queryKey: ["role-presets"],
    queryFn: api.getRolePresets,
    enabled: isNew,
  });

  const [name, setName] = useState(BLANK_DEFAULTS.name);
  const [slug, setSlug] = useState(BLANK_DEFAULTS.slug);
  const [description, setDescription] = useState(BLANK_DEFAULTS.description);
  const [modelName, setModelName] = useState(BLANK_DEFAULTS.modelName);
  const [modelBaseUrl, setModelBaseUrl] = useState(BLANK_DEFAULTS.modelBaseUrl);
  const [modelTemperature, setModelTemperature] = useState(BLANK_DEFAULTS.modelTemperature);
  const [modelProvider, setModelProvider] = useState(BLANK_DEFAULTS.modelProvider);
  const [systemPrompt, setSystemPrompt] = useState(BLANK_DEFAULTS.systemPrompt);
  const [selectedTools, setSelectedTools] = useState<string[]>(BLANK_DEFAULTS.selectedTools);
  const [defaultRunInput, setDefaultRunInput] = useState(BLANK_DEFAULTS.defaultRunInput);
  const [maxConcurrentRuns, setMaxConcurrentRuns] = useState(BLANK_DEFAULTS.maxConcurrentRuns);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setSlug(agent.slug);
      setDescription(agent.description ?? "");
      setModelName(agent.modelName);
      setModelBaseUrl(agent.modelBaseUrl ?? "");
      setModelTemperature(String(agent.modelTemperature));
      setModelProvider(agent.modelProvider);
      setSystemPrompt(agent.systemPrompt);
      setSelectedTools(agent.tools);
      setDefaultRunInput(agent.defaultRunInput ?? "");
      setMaxConcurrentRuns(String(agent.maxConcurrentRuns));
    }
  }, [agent]);

  const toolGroups = useMemo(() => groupTools(tools), [tools]);

  function applyPreset(preset: RolePreset) {
    setName(preset.name);
    setSlug(preset.suggestedSlug);
    setDescription(preset.description);
    setSystemPrompt(preset.systemPrompt);
    setSelectedTools(preset.tools);
    setDefaultRunInput(preset.defaultRunInput);
  }

  function handlePresetChange(presetId: string) {
    setSelectedPresetId(presetId);
    if (presetId === "") {
      setName(BLANK_DEFAULTS.name);
      setSlug(BLANK_DEFAULTS.slug);
      setDescription(BLANK_DEFAULTS.description);
      setSystemPrompt(BLANK_DEFAULTS.systemPrompt);
      setSelectedTools(BLANK_DEFAULTS.selectedTools);
      setDefaultRunInput(BLANK_DEFAULTS.defaultRunInput);
      return;
    }
    const preset = rolePresets.find((p) => p.id === presetId);
    if (preset) applyPreset(preset);
  }

  const saveMutation = useMutation({
    onMutate: () => setSaveFeedback(null),
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required.");
      if (isNew && !slug.trim()) throw new Error("Slug is required.");
      if (isNew && !/^[a-z0-9-]+$/.test(slug)) {
        throw new Error("Slug must use lowercase letters, numbers, and hyphens only.");
      }

      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        description: description || undefined,
        modelProvider,
        modelName,
        modelBaseUrl: modelBaseUrl || undefined,
        modelTemperature: Number(modelTemperature),
        systemPrompt,
        tools: selectedTools,
        defaultRunInput: defaultRunInput || null,
        maxConcurrentRuns: Number(maxConcurrentRuns),
      };
      if (isNew) return api.createAgent(payload);
      return api.updateAgent(id!, payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agents", saved.id] });
      if (isNew) {
        navigate(`/agents/${saved.id}`);
      } else {
        setSaveFeedback("Agent saved.");
      }
    },
    onError: (error) => {
      setSaveFeedback(error instanceof Error ? error.message : "Save failed.");
    },
  });

  useEffect(() => {
    if (!saveFeedback) return;
    const timer = setTimeout(() => setSaveFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [saveFeedback]);

  const runMutation = useMutation({
    mutationFn: async () => {
      let agentId = id;
      if (isNew) {
        const saved = await saveMutation.mutateAsync();
        agentId = saved.id;
      }
      const input = defaultRunInput || "Hello";
      return api.startRun(agentId!, input);
    },
    onSuccess: (data) => navigate(`/runs/${data.runId}`),
  });

  function toggleTool(toolId: string) {
    setSelectedTools((prev) =>
      prev.includes(toolId) ? prev.filter((t) => t !== toolId) : [...prev, toolId],
    );
  }

  const recommendedTools = selectedPresetId
    ? rolePresets.find((p) => p.id === selectedPresetId)?.tools ?? []
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="hud-kicker text-base text-foreground">
        {isNew ? "New agent" : "Edit agent"}
      </h1>

      <Card className="space-y-4">
        {isNew && (
          <div>
            <Label>Start from template</Label>
            <select
              className="hud-mono mt-1 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent/60"
              value={selectedPresetId}
              onChange={(e) => handlePresetChange(e.target.value)}
            >
              <option value="">Blank agent</option>
              {rolePresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            {recommendedTools.length > 0 && (
              <p className="mt-2 text-sm text-muted">
                Recommended tools: {recommendedTools.join(", ")}
              </p>
            )}
          </div>
        )}

        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} disabled={!isNew} />
        </div>
        <div>
          <Label>Description</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <Label>Model provider</Label>
          <select
            className="hud-mono mt-1 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent/60"
            value={modelProvider}
            onChange={(e) => setModelProvider(e.target.value)}
          >
            <option value="openai">OpenAI-compatible</option>
            <option value="anthropic" disabled>
              Anthropic (later)
            </option>
            <option value="bedrock" disabled>
              Bedrock (later)
            </option>
          </select>
          <p className="mt-1 text-xs text-muted">
            OpenAI-compatible endpoint; use base URL for Ollama or LiteLLM.
          </p>
        </div>
        <div>
          <Label>Model</Label>
          <Input value={modelName} onChange={(e) => setModelName(e.target.value)} />
        </div>
        <div>
          <Label>Base URL (optional)</Label>
          <Input
            value={modelBaseUrl}
            onChange={(e) => setModelBaseUrl(e.target.value)}
            placeholder="http://localhost:11434/v1"
          />
        </div>
        <div>
          <Label>Temperature</Label>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={modelTemperature}
            onChange={(e) => setModelTemperature(e.target.value)}
          />
        </div>
        <div>
          <Label>Max concurrent runs</Label>
          <Input
            type="number"
            min="1"
            value={maxConcurrentRuns}
            onChange={(e) => setMaxConcurrentRuns(e.target.value)}
          />
        </div>
        <div>
          <Label>System prompt</Label>
          <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
        </div>

        <div>
          <Label>Tools</Label>
          {toolGroups.safe.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Safe</p>
              {toolGroups.safe.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  checked={selectedTools.includes(tool.id)}
                  onToggle={() => toggleTool(tool.id)}
                />
              ))}
            </div>
          )}
          {toolGroups.network.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Network</p>
              {toolGroups.network.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  checked={selectedTools.includes(tool.id)}
                  onToggle={() => toggleTool(tool.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <Label>Default run input</Label>
          <Textarea
            value={defaultRunInput}
            onChange={(e) => setDefaultRunInput(e.target.value)}
            placeholder="Message used when you click Run"
          />
        </div>
        <div className="space-y-2 pt-2">
          <div className="flex gap-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || (!isNew && !agent)}
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending || (!isNew && !agent)}
            >
              Run
            </Button>
          </div>
          {saveFeedback && (
            <p
              className={
                saveFeedback === "Agent saved."
                  ? "hud-mono text-sm text-success"
                  : "text-sm text-danger"
              }
            >
              {saveFeedback}
            </p>
          )}
          {runMutation.isError && (
            <p className="text-sm text-danger">
              {runMutation.error instanceof Error ? runMutation.error.message : "Run failed."}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
