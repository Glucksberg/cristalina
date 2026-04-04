import type { ParsedObject } from "@cristalina/validate";
import type { PrivacyScope, ProjectionProfile } from "@cristalina/types";
import { filterByAudience } from "./scoring.js";

export interface BootstrapFiles {
  soul: string;
  value: string;
  user: string;
  memory: string;
}

type TaggedKind = "fact" | "constraint" | "belief" | "project" | "identity_trait" | "style_rule";

interface BootstrapOptions {
  activeProject?: string;
  recentEvents?: ParsedObject[];
  narrativeStory?: string;
}

/** Generate bootstrap projection files (SOUL.md, VALUE.md, USER.md, MEMORY.md) */
export function generateBootstrap(
  coreObjects: ParsedObject[],
  contradictions: ParsedObject[],
  audience: PrivacyScope = "owner_private",
  profile: ProjectionProfile = "standard",
  options: BootstrapOptions = {},
): BootstrapFiles {
  const filtered = filterByAudience(coreObjects, audience);
  const active = filtered.filter((o) =>
    o.data.status === "ratified" || o.data.status === "crystallized",
  );
  const limits = bootstrapLimits(profile);
  const recentEvents = options.recentEvents ?? [];

  return {
    soul: renderSoul(active, contradictions, limits, options.narrativeStory),
    value: renderValue(active, limits),
    user: renderUser(active, limits),
    memory: renderMemory(active, contradictions, limits, options.activeProject, recentEvents),
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

function renderSoul(
  objects: ParsedObject[],
  contradictions: ParsedObject[],
  limits: ReturnType<typeof bootstrapLimits>,
  narrativeStory?: string,
): string {
  const lines: string[] = ["# SOUL\n"];

  const traits = objects.filter((o) => o.data.kind === "identity_trait").slice(0, limits.traits);
  if (traits.length > 0) {
    for (const obj of traits) {
      lines.push(`- ${formatTaggedStatement("identity_trait", obj.data.statement as string)}`);
    }
  } else {
    lines.push("You are a practical personal agent with governed long-term memory.");
  }

  const style = objects.filter((o) => o.data.kind === "style_rule").slice(0, limits.traits);
  if (style.length > 0) {
    lines.push("\n## Style");
    for (const obj of style) {
      lines.push(`- ${formatTaggedStatement("style_rule", obj.data.statement as string)}`);
    }
  }

  const narrative = narrativeExcerpt(narrativeStory);
  if (narrative.length > 0) {
    lines.push("\n## Narrative");
    for (const entry of narrative) {
      lines.push(`- ${entry}`);
    }
  }

  lines.push("\n## Runtime Attention");
  lines.push("- Read compiled context selectively before acting.");
  lines.push("- Write runtime memory with clean semantics.");
  lines.push("- Do not confuse preference, fact, belief, constraint, and project.");
  lines.push("- Preserve human intent without flattening meaning.");
  lines.push("- Treat Ingest Feedback as read-only system data; update machine-safe sections instead.");

  const openContradictions = contradictions.filter((c) => c.data.status === "open").length;
  if (openContradictions > 0) {
    lines.push(`- You have ${openContradictions} open contradiction${openContradictions === 1 ? "" : "s"}; avoid speaking with false certainty where the store is contested.`);
  }

  const beliefCount = objects.filter((o) => o.data.kind === "belief").length;
  if (beliefCount > 0) {
    lines.push(`- The store currently holds ${beliefCount} belief${beliefCount === 1 ? "" : "s"}; keep belief distinct from fact when writing back to memory.`);
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
    lines.push("## Interaction Preferences");
    for (const obj of prefs) {
      lines.push(`- ${obj.data.statement}`);
    }
  }

  const facts = objects
    .filter((o) => o.data.kind === "fact" || o.data.kind === "constraint" || o.data.kind === "belief")
    .slice(0, limits.facts);
  if (facts.length > 0) {
    lines.push("\n## User Model");
    for (const obj of facts) {
      lines.push(`- ${formatTaggedStatement(obj.data.kind as TaggedKind, obj.data.statement as string)}`);
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
  activeProject: string | undefined,
  recentEvents: ParsedObject[],
): string {
  const lines: string[] = ["# MEMORY\n"];

  const projects = objects
    .filter((o) => o.data.kind === "project")
    .sort((a, b) => compareProjectPriority(a, b, activeProject))
    .slice(0, Math.max(3, Math.floor(limits.memory / 2)));

  if (projects.length > 0) {
    lines.push("## Active Projects");
    for (const obj of projects) {
      lines.push(`- ${formatTaggedStatement("project", obj.data.statement as string)}`);
    }
  }

  const userModelObjects = objects
    .filter((o) => o.data.kind === "fact" || o.data.kind === "constraint" || o.data.kind === "belief")
    .slice(0, limits.facts);
  const userModelIds = new Set(
    userModelObjects
      .map((obj) => typeof obj.data.id === "string" ? obj.data.id : null)
      .filter((id): id is string => id !== null),
  );

  const openLoopIds = new Set(
    objects
      .filter((o) => o.data.kind === "constraint")
      .filter((o) => Array.isArray(o.data.tags) && o.data.tags.some((tag) => tag === "open_loop"))
      .map((obj) => typeof obj.data.id === "string" ? obj.data.id : null)
      .filter((id): id is string => id !== null),
  );

  // Working set is operationally useful semantic memory, not identity/value/style duplication.
  const workingSet = objects
    .filter((o) => typeof o.data.confidence === "number")
    .filter((o) => o.data.kind === "fact" || o.data.kind === "constraint" || o.data.kind === "belief")
    .filter((o) => {
      const id = typeof o.data.id === "string" ? o.data.id : null;
      if (!id) return true;
      return !userModelIds.has(id) && !openLoopIds.has(id);
    })
    .sort((a, b) => (b.data.confidence as number) - (a.data.confidence as number))
    .slice(0, limits.memory);

  if (workingSet.length > 0) {
    lines.push(`${projects.length > 0 ? "\n" : ""}## Working Set`);
    for (const obj of workingSet) {
      lines.push(`- ${formatTaggedStatement(obj.data.kind as TaggedKind, obj.data.statement as string)}`);
    }
  }

  const openLoopConstraints = objects
    .filter((o) => o.data.kind === "constraint")
    .filter((o) => Array.isArray(o.data.tags) && o.data.tags.some((tag) => tag === "open_loop"))
    .slice(0, limits.contradictions);
  if (openLoopConstraints.length > 0) {
    lines.push("\n## Open Loops");
    for (const obj of openLoopConstraints) {
      lines.push(`- ${formatTaggedStatement("constraint", obj.data.statement as string)}`);
    }
  }

  const openContradictions = contradictions.filter((c) => c.data.status === "open").slice(0, limits.contradictions);
  if (openContradictions.length > 0) {
    lines.push("\n## Contradictions");
    for (const c of openContradictions) {
      lines.push(`- ${c.data.reason}`);
    }
  }

  const feedback = recentEvents
    .filter((event) => event.data.kind === "runtime_drift")
    .filter((event) => {
      const details = typeof event.data.details === "object" && event.data.details !== null
        ? event.data.details as Record<string, unknown>
        : null;
      return details?.code === "drift_only";
    })
    .sort((a, b) => {
      const left = typeof a.data.ts === "string" ? Date.parse(a.data.ts) : 0;
      const right = typeof b.data.ts === "string" ? Date.parse(b.data.ts) : 0;
      return right - left;
    })
    .slice(0, 2);

  if (feedback.length > 0) {
    lines.push("\n## Ingest Feedback");
    for (const event of feedback) {
      const details = event.data.details as Record<string, unknown>;
      const file = typeof details.file === "string" ? details.file : "workspace";
      const message = typeof details.message === "string"
        ? details.message
        : "Recent runtime drift stayed observational only.";
      lines.push(`- ${file}: ${message}`);
    }
  }

  if (
    projects.length === 0
    && workingSet.length === 0
    && openLoopConstraints.length === 0
    && openContradictions.length === 0
    && feedback.length === 0
  ) {
    lines.push("No active memory yet.");
  }

  return lines.join("\n") + "\n";
}

function formatTaggedStatement(kind: TaggedKind, statement: string): string {
  return `[${kind}] ${statement}`;
}

function narrativeExcerpt(story: string | undefined): string[] {
  if (!story) return [];
  return story
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .slice(0, 2);
}

function compareProjectPriority(left: ParsedObject, right: ParsedObject, activeProject: string | undefined): number {
  const leftBoost = projectMatchScore(left, activeProject);
  const rightBoost = projectMatchScore(right, activeProject);
  if (leftBoost !== rightBoost) return rightBoost - leftBoost;
  return Number(right.data.confidence ?? 0) - Number(left.data.confidence ?? 0);
}

function projectMatchScore(obj: ParsedObject, activeProject: string | undefined): number {
  if (!activeProject) return 0;
  const normalized = activeProject.trim().toLowerCase();
  if (!normalized) return 0;

  const id = typeof obj.data.id === "string" ? obj.data.id.toLowerCase() : "";
  const statement = typeof obj.data.statement === "string" ? obj.data.statement.toLowerCase() : "";
  const relatedEntities = Array.isArray(obj.data.related_entities)
    ? obj.data.related_entities
        .filter((entity): entity is string => typeof entity === "string")
        .map((entity) => entity.toLowerCase())
    : [];

  if (id === normalized || relatedEntities.includes(normalized)) return 2;
  if (statement.includes(normalized)) return 1;
  return 0;
}
