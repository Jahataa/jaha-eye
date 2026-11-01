export function isOfficeEnabled(): boolean {
  const raw = process.env.OFFICE_ENABLED?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off") return false;
  return true;
}

export function officeRouterModel(): string {
  return process.env.OFFICE_ROUTER_MODEL?.trim() || process.env.OFFICE_LLM_MODEL?.trim() || "gpt-4o-mini";
}

export function officeTeamMax(): number {
  const parsed = Number(process.env.OFFICE_TEAM_MAX ?? "4");
  if (!Number.isFinite(parsed) || parsed < 1) return 4;
  return Math.min(8, Math.floor(parsed));
}

export function brainExportDir(): string | null {
  const dir = process.env.BRAIN_EXPORT_DIR?.trim();
  return dir || null;
}
