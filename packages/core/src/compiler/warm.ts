import type { ScoredObject } from "./scoring.js";

/** Render WARM tier: recent history, recurring decisions, stable patterns */
export function renderWarm(objects: ScoredObject[]): string {
  const lines: string[] = ["# Extended Context (WARM)\n"];

  // Group by kind
  const groups = new Map<string, ScoredObject[]>();
  for (const obj of objects) {
    const kind = typeof obj.object.data.kind === "string" ? obj.object.data.kind : "other";
    const group = groups.get(kind) ?? [];
    group.push(obj);
    groups.set(kind, group);
  }

  for (const [kind, items] of groups) {
    lines.push(`## ${kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`);
    for (const { object } of items) {
      const confidence = typeof object.data.confidence === "number" ? ` (${object.data.confidence})` : "";
      lines.push(`- ${object.data.statement}${confidence}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
