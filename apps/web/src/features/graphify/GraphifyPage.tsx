import { useMemo } from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { DocHelp } from "../docs/DocHelp";
import { MermaidBlock } from "../docs/MermaidBlock";
import { buildErDiagramMermaid, buildPipelineMermaid } from "./build-er-diagram";
import { useGraphifyRebuild, useGraphifyStatus } from "./queries";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="space-y-1 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="hud-figure text-2xl text-accent">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </Card>
  );
}

function formatBuiltAt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function GraphifyPage() {
  const { data: status, isLoading } = useGraphifyStatus();
  const rebuild = useGraphifyRebuild();
  const running = status?.rebuild.phase === "running";

  const erDiagram = useMemo(
    () => buildErDiagramMermaid(status?.database ?? null),
    [status?.database],
  );
  const pipelineDiagram = useMemo(() => buildPipelineMermaid(running), [running]);

  async function runRebuild(mode: "extract" | "update", includePostgres: boolean) {
    await rebuild.mutateAsync({ mode, includePostgres });
  }

  if (isLoading || !status) {
    return <p className="text-muted">Loading graph status…</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="hud-kicker text-base text-foreground">Knowledge graph</h1>
        <DocHelp feature="graphify" />
      </div>

      {!status.enabled && (
        <Card className="border-danger/40 p-4 text-sm text-danger">
          Graphify UI is disabled on this API (`GRAPHIFY_UI=0`).
        </Card>
      )}

      {!status.cliAvailable && (
        <Card className="border-danger/40 p-4 text-sm text-danger">
          `graphify` CLI not found on the API host. Install with{" "}
          <code className="hud-mono text-xs">uv tool install &apos;graphifyy[postgres]&apos;</code>{" "}
          and restart the API.
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Graph"
          value={status.graphExists ? "Ready" : "Missing"}
          hint={status.graphExists ? formatBuiltAt(status.builtAt) : "Run extract below"}
        />
        <StatCard label="Code nodes" value={String(status.codeNodeCount)} />
        <StatCard label="Edges" value={String(status.edgeCount)} />
        <StatCard
          label="Database"
          value={status.database ? status.database.databaseName ?? "Linked" : "Not in graph"}
          hint={
            status.database
              ? `${status.database.tables.length} table(s) from Postgres introspection`
              : "Needs extract with DATABASE_URL + Postgres up"
          }
        />
      </div>

      <Card className="space-y-4 p-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Pipeline</h2>
          <p className="mt-1 text-sm text-muted">
            Local Graphify merges AST extraction from this repo with live PostgreSQL schema into{" "}
            <code className="hud-mono text-xs">graphify-out/graph.json</code>. The dashboard reads
            that file through the API — it does not replace Prisma migrations.
          </p>
        </div>
        <MermaidBlock chart={pipelineDiagram} />
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!status.enabled || !status.cliAvailable || running || rebuild.isPending}
          onClick={() => void runRebuild("extract", true)}
        >
          {running && status.rebuild.mode === "extract" ? "Extracting…" : "Rebuild (code + DB)"}
        </Button>
        <Button
          variant="outline"
          disabled={!status.enabled || !status.cliAvailable || running || rebuild.isPending}
          onClick={() => void runRebuild("update", false)}
        >
          {running && status.rebuild.mode === "update" ? "Updating…" : "Update code only"}
        </Button>
      </div>

      {(status.rebuild.logTail.length > 0 || status.rebuild.error) && (
        <Card className="space-y-2 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Activity log
          </h2>
          {status.rebuild.error && (
            <p className="text-sm text-danger">{status.rebuild.error}</p>
          )}
          <pre className="hud-mono max-h-64 overflow-auto border border-border bg-background p-3 text-xs text-foreground">
            {status.rebuild.logTail.join("\n") || "—"}
          </pre>
        </Card>
      )}

      {erDiagram && (
        <Card className="space-y-3 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            PostgreSQL schema (from graph)
          </h2>
          <MermaidBlock chart={erDiagram} />
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {status.database?.tables.map((t) => (
              <li key={t.id} className="hud-mono text-muted">
                {t.name}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!status.graphExists && (
        <Card className="p-4 text-sm text-muted">
          No graph on disk yet. Use <strong>Rebuild (code + DB)</strong> or run{" "}
          <code className="hud-mono text-xs">npm run graphify:extract</code> from the repo root,
          then refresh this page.
        </Card>
      )}
    </div>
  );
}
