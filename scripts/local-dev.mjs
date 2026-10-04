#!/usr/bin/env node
import { spawn, execSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createConnection } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LOCAL_DEV_DIR = join(ROOT, ".local-dev");
const STATE_FILE = join(LOCAL_DEV_DIR, "state.json");
const LOG_FILE = join(LOCAL_DEV_DIR, "dev.log");
const ENV_FILE = join(ROOT, ".env");
const ENV_EXAMPLE = join(ROOT, ".env.example");

const DEFAULT_PORTS = { api: 4000, web: 5173 };
const READINESS_TIMEOUT_MS = 30_000;
const READINESS_INTERVAL_MS = 500;

const isWindows = process.platform === "win32";

function log(message) {
  console.log(message);
}

function warn(message) {
  console.warn(`Warning: ${message}`);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function run(command, args) {
  try {
    execSync([command, ...args].join(" "), {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
      shell: isWindows,
    });
  } catch (error) {
    const detail = error.stderr?.toString().trim();
    fail(
      `Command failed: ${command} ${args.join(" ")}${detail ? `\n${detail}` : ""}`,
    );
  }
}

function commandExists(name) {
  try {
    if (isWindows) {
      execSync(`where ${name}`, { stdio: "ignore" });
    } else {
      execSync(`command -v ${name}`, { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

function checkNodeVersion() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 22) {
    fail(`Node.js 22+ required (found ${process.versions.node}).`);
  }
}

function checkDocker() {
  if (!commandExists("docker")) {
    fail("Docker is not installed or not on PATH.");
  }

  try {
    execSync("docker info", { stdio: "ignore" });
  } catch {
    fail("Docker daemon is not running. Start Docker Desktop and try again.");
  }

  try {
    execSync("docker compose version", { stdio: "ignore" });
  } catch {
    fail("docker compose is not available. Install Docker Compose v2.");
  }
}

function readState() {
  if (!existsSync(STATE_FILE)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function writeState(state) {
  mkdirSync(LOCAL_DEV_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + "\n");
}

function clearState() {
  if (existsSync(STATE_FILE)) {
    unlinkSync(STATE_FILE);
  }
}

function isProcessAlive(pid) {
  if (!pid || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function getRunningState() {
  const state = readState();
  if (!state?.pid) {
    return null;
  }

  if (isProcessAlive(state.pid)) {
    return state;
  }

  clearState();
  return null;
}

function killProcessTree(pid) {
  if (!pid || pid <= 0) {
    return;
  }

  try {
    if (isWindows) {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(-pid, "SIGTERM");
    }
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Process already exited.
    }
  }
}

function ensureEnvFile() {
  if (existsSync(ENV_FILE)) {
    return;
  }

  if (!existsSync(ENV_EXAMPLE)) {
    fail("Missing .env and .env.example.");
  }

  copyFileSync(ENV_EXAMPLE, ENV_FILE);
  log("Created .env from .env.example.");
}

function warnIfPlaceholderApiKey() {
  if (!existsSync(ENV_FILE)) {
    return;
  }

  const env = readFileSync(ENV_FILE, "utf8");
  const keyMatch = env.match(/^OPENAI_API_KEY=(.*)$/m);
  const value = keyMatch?.[1]?.trim() ?? "";

  if (!value || value === "sk-your-key-here" || value === "your-key-here") {
    warn(
      "OPENAI_API_KEY looks unset. Edit .env before running agents that call a model.",
    );
  }
}

function loadPorts() {
  const ports = { ...DEFAULT_PORTS };

  if (!existsSync(ENV_FILE)) {
    return ports;
  }

  const env = readFileSync(ENV_FILE, "utf8");
  const apiPort = env.match(/^API_PORT=(\d+)/m)?.[1];
  const webPort = env.match(/^VITE_DEV_PORT=(\d+)/m)?.[1];

  if (apiPort) {
    ports.api = Number(apiPort);
  }
  if (webPort) {
    ports.web = Number(webPort);
  }

  return ports;
}

function waitForPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host });

    socket.on("connect", () => {
      socket.end();
      resolve(true);
    });

    socket.on("error", () => {
      resolve(false);
    });
  });
}

async function waitForPorts(ports) {
  const deadline = Date.now() + READINESS_TIMEOUT_MS;
  const targets = [
    { name: "API", port: ports.api },
    { name: "Web", port: ports.web },
  ];

  while (Date.now() < deadline) {
    const results = await Promise.all(
      targets.map(async (target) => ({
        ...target,
        ready: await waitForPort(target.port),
      })),
    );

    if (results.every((result) => result.ready)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, READINESS_INTERVAL_MS));
  }

  const pending = targets.map((target) => `${target.name}:${target.port}`).join(", ");
  warn(`Timed out waiting for ${pending}. Check ${LOG_FILE}.`);
}

function startDevServers() {
  mkdirSync(LOCAL_DEV_DIR, { recursive: true });

  const logFd = openSync(LOG_FILE, "a");

  const child = spawn(isWindows ? "npm.cmd" : "npm", ["run", "dev"], {
    cwd: ROOT,
    detached: !isWindows,
    stdio: ["ignore", logFd, logFd],
    env: process.env,
    shell: isWindows,
  });

  child.unref();

  return child.pid;
}

async function cmdStart() {
  checkNodeVersion();
  checkDocker();

  const running = getRunningState();
  if (running) {
    fail(
      `Local dev is already running (pid ${running.pid}). Run "npm run local:stop" first.`,
    );
  }

  ensureEnvFile();
  warnIfPlaceholderApiKey();

  log("Starting Postgres...");
  run("docker", ["compose", "up", "-d", "--wait"]);

  log("Installing dependencies...");
  run("npm", ["install"]);

  log("Applying database migrations...");
  run("npm", ["run", "db:migrate:deploy"]);

  const ports = loadPorts();

  log("Starting dev servers...");
  const pid = startDevServers();
  writeState({
    pid,
    startedAt: new Date().toISOString(),
    ports,
    logFile: LOG_FILE,
  });

  await waitForPorts(ports);

  log("");
  log("jaha-eye is running.");
  log(`Web UI: http://localhost:${ports.web}`);
  log(`API:    http://localhost:${ports.api}`);
  log(`Logs:   ${LOG_FILE}`);
  log("");
  log('Stop with "npm run local:stop".');
}

function cmdStop() {
  const state = readState();
  if (state?.pid && isProcessAlive(state.pid)) {
    log(`Stopping dev servers (pid ${state.pid})...`);
    killProcessTree(state.pid);
  } else if (state?.pid) {
    warn(`Stale pid ${state.pid}; dev servers were not running.`);
  } else {
    log("Dev servers were not running.");
  }

  log("Stopping Postgres...");
  try {
    execSync("docker compose down", { cwd: ROOT, stdio: "inherit" });
  } catch {
    warn("docker compose down failed. Is Docker running?");
  }

  clearState();
  log("Local dev stopped.");
}

function cmdStatus() {
  const state = getRunningState();

  if (!state) {
    log("Status: stopped");
    return;
  }

  log("Status: running");
  log(`PID:        ${state.pid}`);
  log(`Started at: ${state.startedAt}`);
  log(`Web UI:     http://localhost:${state.ports?.web ?? DEFAULT_PORTS.web}`);
  log(`API:        http://localhost:${state.ports?.api ?? DEFAULT_PORTS.api}`);
  log(`Logs:       ${state.logFile ?? LOG_FILE}`);
}

function printUsage() {
  console.log(`Usage: node scripts/local-dev.mjs <command>

Commands:
  start   Bootstrap Postgres, deps, migrations, and dev servers
  stop    Stop dev servers and docker compose down
  status  Show whether local dev is running
`);
}

const command = process.argv[2];

switch (command) {
  case "start":
    await cmdStart();
    break;
  case "stop":
    cmdStop();
    break;
  case "status":
    cmdStatus();
    break;
  default:
    printUsage();
    process.exit(command ? 1 : 0);
}
