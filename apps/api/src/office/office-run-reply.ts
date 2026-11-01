/** Best-effort assistant text from persisted run.output when events lack a reply. */
export function replyFromRunOutput(output: unknown): string | null {
  if (output == null) return null;
  if (typeof output === "string") {
    const trimmed = output.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof output !== "object") return null;

  const record = output as Record<string, unknown>;
  if (Array.isArray(record.replies)) {
    const parts = record.replies
      .map((entry) => {
        if (!entry || typeof entry !== "object") return "";
        const piece = entry as { output?: unknown };
        return typeof piece.output === "string" ? piece.output.trim() : "";
      })
      .filter((text) => text.length > 0);
    if (parts.length > 0) return parts.join("\n\n");
  }

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim();
  }

  return null;
}
