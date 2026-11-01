import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AgentDefinition } from "@jaha-eye/shared";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

type OfficeTaskBarProps = {
  agents: AgentDefinition[];
};

export function OfficeTaskBar({ agents }: OfficeTaskBarProps) {
  const queryClient = useQueryClient();
  const departments = [...new Set(agents.map((a) => a.department?.trim() || "General"))].sort();
  const [department, setDepartment] = useState(departments[0] ?? "General");
  const [text, setText] = useState("");
  const [team, setTeam] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      api.createOfficeTask({
        department,
        text,
        team,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["office-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      setText("");
      setError(null);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Task failed"),
  });

  return (
    <section className="rounded border border-border bg-card/50 p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">Task bar</p>
      <div className="flex flex-wrap gap-3">
        <div>
          <Label htmlFor="office-dept">Department</Label>
          <select
            id="office-dept"
            className="hud-mono mt-1 block border border-border bg-background px-2 py-1 text-sm"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-end gap-2 pb-1 text-xs text-muted">
          <input type="checkbox" checked={team} onChange={(e) => setTeam(e.target.checked)} />
          Team mode
        </label>
      </div>
      <div>
        <Label htmlFor="office-task-text">Request</Label>
        <Textarea
          id="office-task-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe work for the router…"
          rows={3}
        />
      </div>
      <Button
        type="button"
        disabled={!text.trim() || createMutation.isPending}
        onClick={() => createMutation.mutate()}
      >
        {createMutation.isPending ? "Routing…" : "Create task"}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </section>
  );
}
