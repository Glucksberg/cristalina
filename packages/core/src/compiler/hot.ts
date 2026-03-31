import type { ScoredObject } from "./scoring.js";

/** Render HOT tier: identity essentials, critical values, active preferences, urgent loops */
export function renderHot(objects: ScoredObject[], contradictions: Array<{ data: Record<string, unknown> }>): string {
  const lines: string[] = ["# Session Context (HOT)\n"];

  // Identity
  const identity = objects.filter((o) => o.object.data.kind === "identity_trait");
  if (identity.length > 0) {
    lines.push("## Identity");
    for (const { object } of identity) {
      lines.push(`- ${object.data.statement}`);
    }
    lines.push("");
  }

  // Values
  const values = objects.filter((o) => o.object.data.kind === "value" || o.object.data.kind === "priority");
  if (values.length > 0) {
    lines.push("## Values");
    for (const { object } of values) {
      lines.push(`- ${object.data.statement}`);
    }
    lines.push("");
  }

  // Style
  const style = objects.filter((o) => o.object.data.kind === "style_rule");
  if (style.length > 0) {
    lines.push("## Style");
    for (const { object } of style) {
      lines.push(`- ${object.data.statement}`);
    }
    lines.push("");
  }

  // Active preferences
  const prefs = objects.filter((o) => o.object.data.kind === "preference");
  if (prefs.length > 0) {
    lines.push("## Active Preferences");
    for (const { object } of prefs) {
      lines.push(`- ${object.data.statement}`);
    }
    lines.push("");
  }

  // Urgent loops (open contradictions)
  const open = contradictions.filter((c) => c.data.status === "open");
  if (open.length > 0) {
    lines.push("## Urgent Loops");
    for (const c of open) {
      lines.push(`- [${c.data.id}] ${c.data.reason} (${c.data.left} vs ${c.data.right})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
