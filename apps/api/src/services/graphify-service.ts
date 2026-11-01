import { spawn } from "node:child_process";
import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { GraphifyRebuildJob, GraphifyStatus } from "@jaha-eye/shared";
import { countPostgresNodes, parseDatabaseSnapshot, type GraphJson } from "./graphify-parse.js";

const apiDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(apiDir, "../../../..");
const graphDir = resolve(repoRoot, "graphify-out");
const graphPath = resolve(graphDir, "graph.json");

const MAX_LOG_LINES = 80;

let rebuildJob: GraphifyRebuildJob = idleJob();

function idleJob(): GraphifyRebuildJob {
  return {
    phase: "idle",
    mode: null,
    startedAt: null,
    finishedAt: null,
    logTail: [],
    error: null,
  };
}

function pushLog(line: string) {
  const trimmed = line.trimEnd();
  if (!trimmed) return;
  const next = [...rebuildJob.logTail, trimmed];
  rebuildJob = { ...rebuildJob, logTail: next.slice(-MAX_LOG_LINES) };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function cliAvailable(): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const child = spawn("which", ["graphify"], { stdio: ["ignore", "pipe", "ignore"] });
    child.on("close", (code) => resolvePromise(code === 0));
    child.on("error", () => resolvePromise(false));
  });
}

function isEnabled(): boolean {
  return process.env.GRAPHIFY_UI !== "0";
}

async function readGraphSnapshot(): Promise<{
  builtAt: string | null;
  nodeCount: number;
  edgeCount: number;
  codeNodeCount: number;
  database: ReturnType<typeof parseDatabaseSnapshot>;
}> {
  const raw = await readFile(graphPath, "utf8");
  const graph = JSON.parse(raw) as GraphJson;
  const st = await stat(graphPath);
  const pgCount = countPostgresNodes(graph);
  const nodeCount = graph.nodes?.length ?? 0;
  return {
    builtAt: st.mtime.toISOString(),
    nodeCount,
    edgeCount: graph.edges?.length ?? 0,
    codeNodeCount: Math.max(0, nodeCount - pgCount),
    database: parseDatabaseSnapshot(graph),
  };
}

export async function getGraphifyStatus(): Promise<GraphifyStatus> {
  const enabled = isEnabled();
  const hasCli = await cliAvailable();
  const graphExists = await fileExists(graphPath);

  if (!graphExists) {
    return {
      enabled,
      cliAvailable: hasCli,
      graphExists: false,
      graphPath,
      builtAt: null,
      nodeCount: 0,
      edgeCount: 0,
      codeNodeCount: 0,
      database: null,
      rebuild: rebuildJob,
    };
  }

  const snapshot = await readGraphSnapshot();
  return {
    enabled,
    cliAvailable: hasCli,
    graphExists: true,
    graphPath,
    ...snapshot,
    rebuild: rebuildJob,
  };
}

function buildExtractArgs(includePostgres: boolean): string[] {
  const args = ["extract", ".", "--code-only", "--no-cluster"];
  if (includePostgres && process.env.DATABASE_URL?.trim()) {
    args.push("--postgres", process.env.DATABASE_URL.trim());
  }
  return args;
}

export function startGraphifyRebuild(options: {
  mode: "extract" | "update";
  includePostgres: boolean;
}): { ok: true } | { ok: false; error: string } {
  if (!isEnabled()) {
    return { ok: false, error: "Graphify UI is disabled (GRAPHIFY_UI=0)." };
  }
  if (rebuildJob.phase === "running") {
    return { ok: false, error: "A rebuild is already in progress." };
  }

  const args =
    options.mode === "update" ? ["update", "."] : buildExtractArgs(options.includePostgres);

  rebuildJob = {
    phase: "running",
    mode: options.mode,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    logTail: [],
    error: null,
  };

  pushLog(`$ graphify ${args.join(" ")}`);

  const child = spawn("graphify", args, {
    cwd: repoRoot,
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString("utf8").split("\n")) {
      pushLog(line);
    }
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString("utf8").split("\n")) {
      pushLog(line);
    }
  });

  child.on("close", (code) => {
    rebuildJob = {
      ...rebuildJob,
      phase: code === 0 ? "succeeded" : "failed",
      finishedAt: new Date().toISOString(),
      error: code === 0 ? null : `graphify exited with code ${code ?? "unknown"}`,
    };
  });

  child.on("error", (err) => {
    rebuildJob = {
      ...rebuildJob,
      phase: "failed",
      finishedAt: new Date().toISOString(),
      error: err.message,
    };
  });

  return { ok: true };
}

/** @internal test helper */
export function resetGraphifyRebuildJobForTests() {
  rebuildJob = idleJob();
}
