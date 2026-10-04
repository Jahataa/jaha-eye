export const CRON_PRESETS = [
  { label: "Every minute", expression: "* * * * *" },
  { label: "Every hour", expression: "0 * * * *" },
  { label: "Daily at 8:00", expression: "0 8 * * *" },
  { label: "Weekdays at 9:00", expression: "0 9 * * 1-5" },
] as const;
