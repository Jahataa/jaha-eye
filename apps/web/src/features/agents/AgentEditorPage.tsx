import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Checkbox } from "../../components/ui/checkbox";
import { Card } from "../../components/ui/card";

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

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [modelName, setModelName] = useState("llama3.1:latest");
  const [modelBaseUrl, setModelBaseUrl] = useState("");
  const [modelTemperature, setModelTemperature] = useState("0.7");
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful assistant.");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [runInput, setRunInput] = useState("What time is it? Use the current_time tool.");

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setSlug(agent.slug);
      setDescription(agent.description ?? "");
      setModelName(agent.modelName);
      setModelBaseUrl(agent.modelBaseUrl ?? "");
      setModelTemperature(String(agent.modelTemperature));
      setSystemPrompt(agent.systemPrompt);
      setSelectedTools(agent.tools);
    }
  }, [agent]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        slug,
        description: description || undefined,
        modelProvider: "openai",
        modelName,
        modelBaseUrl: modelBaseUrl || undefined,
        modelTemperature: Number(modelTemperature),
        systemPrompt,
        tools: selectedTools,
        maxConcurrentRuns: 1,
      };
      if (isNew) return api.createAgent(payload);
      return api.updateAgent(id!, payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      if (isNew) navigate(`/agents/${saved.id}`);
    },
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      let agentId = id;
      if (isNew) {
        const saved = await saveMutation.mutateAsync();
        agentId = saved.id;
      }
      return api.startRun(agentId!, runInput);
    },
    onSuccess: (data) => navigate(`/runs/${data.runId}`),
  });

  function toggleTool(toolId: string) {
    setSelectedTools((prev) =>
      prev.includes(toolId) ? prev.filter((t) => t !== toolId) : [...prev, toolId],
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{isNew ? "New agent" : "Edit agent"}</h1>

      <Card className="space-y-4">
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
          <Label>System prompt</Label>
          <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
        </div>
        <div>
          <Label>Tools</Label>
          <div className="mt-2 space-y-2">
            {tools.map((tool) => (
              <label key={tool.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedTools.includes(tool.id)}
                  onChange={() => toggleTool(tool.id)}
                />
                <span>{tool.name}</span>
                <span className="text-muted">— {tool.description}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label>Run input (for Test Run)</Label>
          <Textarea value={runInput} onChange={(e) => setRunInput(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            Save
          </Button>
          <Button variant="outline" onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
            Run
          </Button>
        </div>
      </Card>
    </div>
  );
}
