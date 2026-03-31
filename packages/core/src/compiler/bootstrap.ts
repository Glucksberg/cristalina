import type { ParsedObject } from "@cristalina/validate";
import type { PrivacyScope, ProjectionProfile } from "@cristalina/types";
import { filterByAudience } from "./scoring.js";

export interface BootstrapFiles {
  soul: string;
  value: string;
  user: string;
  memory: string;
}

/** Generate bootstrap projection files (SOUL.md, VALUE.md, USER.md, MEMORY.md) */
export function generateBootstrap(
  coreObjects: ParsedObject[],
  contradictions: ParsedObject[],
  audience: PrivacyScope = "owner_private",
  profile: ProjectionProfile = "standard",
): BootstrapFiles {
  const filtered = filterByAudience(coreObjects, audience);
  const active = filtered.filter((o) =>
    o.data.status === "ratified" || o.data.status === "crystallized",
  );
  const limits = bootstrapLimits(profile);

  return {
    soul: renderSoul(active, limits),
    value: renderValue(active, limits),
    user: renderUser(active, limits),
    memory: renderMemory(active, contradictions, limits),
  };
}

function bootstrapLimits(profile: ProjectionProfile) {
  switch (profile) {
    case "tiny":
      return { traits: 4, values: 4, prefs: 5, facts: 5, memory: 5, contradictions: 2 };
    case "deep":
      return { traits: 16, values: 16, prefs: 20, facts: 20, memory: 12, contradictions: 8 };
    default:
      return { traits: 8, values: 8, prefs: 10, facts: 10, memory: 8, contradictions: 4 };
  }
}

function renderSoul(objects: ParsedObject[], limits: ReturnType<typeof bootstrapLimits>): string {
  const lines: string[] = ["# SOUL\n"];

  const traits = objects.filter((o) => o.data.kind === "identity_trait").slice(0, limits.traits);
  if (traits.length > 0) {
    for (const obj of traits) {
      lines.push(`- ${obj.data.statement}`);
    }
  } else {
    lines.push("You are a practical personal agent with governed long-term memory.");
  }

  const style = objects.filter((o) => o.data.kind === "style_rule").slice(0, limits.traits);
  if (style.length > 0) {
    lines.push("\n## Style");
    for (const obj of style) {
      lines.push(`- ${obj.data.statement}`);
    }
  }

  return lines.join("\n") + "\n";
}

function renderValue(objects: ParsedObject[], limits: ReturnType<typeof bootstrapLimits>): string {
  const lines: string[] = ["# VALUE\n"];

  const values = objects
    .filter((o) => o.data.kind === "value" || o.data.kind === "priority")
    .slice(0, limits.values);
  if (values.length > 0) {
    for (const obj of values) {
      lines.push(`- ${obj.data.statement}`);
    }
  } else {
    lines.push("No values ratified yet.");
  }

  return lines.join("\n") + "\n";
}

function renderUser(objects: ParsedObject[], limits: ReturnType<typeof bootstrapLimits>): string {
  const lines: string[] = ["# USER\n"];

  const prefs = objects.filter((o) => o.data.kind === "preference").slice(0, limits.prefs);
  if (prefs.length > 0) {
    lines.push("## Preferences");
    for (const obj of prefs) {
      lines.push(`- ${obj.data.statement}`);
    }
  }

  const facts = objects
    .filter((o) => o.data.kind === "fact" || o.data.kind === "constraint")
    .slice(0, limits.facts);
  if (facts.length > 0) {
    lines.push("\n## Known Facts");
    for (const obj of facts) {
      lines.push(`- ${obj.data.statement}`);
    }
  }

  if (prefs.length === 0 && facts.length === 0) {
    lines.push("No user context ratified yet.");
  }

  return lines.join("\n") + "\n";
}

function renderMemory(
  objects: ParsedObject[],
  contradictions: ParsedObject[],
  limits: ReturnType<typeof bootstrapLimits>,
): string {
  const lines: string[] = ["# MEMORY\n"];

  // High-confidence recent facts
  const sorted = objects
    .filter((o) => typeof o.data.confidence === "number")
    .sort((a, b) => (b.data.confidence as number) - (a.data.confidence as number))
    .slice(0, limits.memory);

  if (sorted.length > 0) {
    lines.push("## Active Memory");
    for (const obj of sorted) {
      lines.push(`- ${obj.data.statement}`);
    }
  }

  // Open loops
  const openContradictions = contradictions.filter((c) => c.data.status === "open").slice(0, limits.contradictions);
  if (openContradictions.length > 0) {
    lines.push("\n## Open Loops");
    for (const c of openContradictions) {
      lines.push(`- ${c.data.reason}`);
    }
  }

  if (sorted.length === 0 && openContradictions.length === 0) {
    lines.push("No active memory yet.");
  }

  return lines.join("\n") + "\n";
}
