import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

export function OfficeSkillsPage() {
  const queryClient = useQueryClient();
  const { data: skills = [] } = useQuery({
    queryKey: ["office-skills"],
    queryFn: api.getOfficeSkills,
  });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      api.createOfficeSkill({ name, slug, body, agentIds: [], departments: [], enabled: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["office-skills"] });
      setName("");
      setSlug("");
      setBody("");
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="hud-kicker text-base text-foreground">Office skills</h1>
      <section className="space-y-2 rounded border border-border p-4">
        <Label>Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
        <Label>Slug</Label>
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
        <Label>Body</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
        <Button
          type="button"
          disabled={!name || !slug || !body || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          Create skill
        </Button>
      </section>
      <ul className="space-y-2">
        {skills.map((skill) => (
          <li key={skill.id} className="rounded border border-border p-3 text-sm">
            <p className="font-semibold">{skill.name}</p>
            <p className="hud-mono text-xs text-muted">{skill.slug}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
