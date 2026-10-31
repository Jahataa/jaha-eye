export type DocTarget = {
  slug: string;
  anchor?: string;
  label: string;
};

export const FEATURE_DOC_LINKS = {
  dashboard: {
    slug: "architecture/overview",
    label: "Architecture overview",
  },
  agentsList: {
    slug: "agents/definitions-and-runs",
    anchor: "agent-definition",
    label: "Agent definitions",
  },
  agentModels: {
    slug: "conf/models",
    anchor: "per-agent-settings-database",
    label: "Per-agent model settings",
  },
  agentTools: {
    slug: "agents/tools",
    label: "Built-in tools",
  },
  agentPresets: {
    slug: "agents/role-presets",
    label: "Role presets",
  },
  orchestrations: {
    slug: "agents/definitions-and-runs",
    anchor: "orchestration-definition",
    label: "Orchestration definitions",
  },
  schedules: {
    slug: "ui/components",
    anchor: "schedule-ticker",
    label: "Schedules & ticker",
  },
  runsList: {
    slug: "agents/definitions-and-runs",
    anchor: "run-list-filtering",
    label: "Run list filtering",
  },
  runEvents: {
    slug: "architecture/events",
    label: "Event stream",
  },
  settingsModels: {
    slug: "conf/models",
    anchor: "global-defaults-settings-ui-or-environment",
    label: "Global model defaults",
  },
  settingsEnvironment: {
    slug: "conf/environment",
    label: "Environment variables",
  },
} as const satisfies Record<string, DocTarget>;

export type FeatureDocKey = keyof typeof FEATURE_DOC_LINKS;
