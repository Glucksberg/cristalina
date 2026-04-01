import type { Diagnostic } from "../diagnostics.js";
import { error, warning } from "../diagnostics.js";
import type { ParsedStore } from "../store/reader.js";

const RULE = "entity-governance";

function activeEntities(store: ParsedStore) {
  return store.entities.filter((entity) => entity.data.status === "active");
}

function collectAliases(entity: ParsedStore["entities"][number]["data"]): string[] {
  return Array.isArray(entity.aliases)
    ? entity.aliases.filter((alias): alias is string => typeof alias === "string")
    : [];
}

export function entityGovernance(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const active = activeEntities(store);
  const activeOwners = active.filter((entity) => entity.data.kind === "owner");
  const activeAgents = active.filter((entity) => entity.data.kind === "agent");

  if (activeOwners.length !== 1) {
    for (const entity of activeOwners.length > 0 ? activeOwners : store.entities) {
      diagnostics.push(error(
        `${RULE}/owner-cardinality`,
        `Cristalina v3 expects exactly one active owner entity; found ${activeOwners.length}.`,
        {
          file: entity.file,
          objectId: typeof entity.data.id === "string" ? entity.data.id : undefined,
        },
      ));
    }
  }

  if (activeAgents.length !== 1) {
    for (const entity of activeAgents.length > 0 ? activeAgents : store.entities) {
      diagnostics.push(error(
        `${RULE}/agent-cardinality`,
        `Cristalina v3 expects exactly one active agent entity; found ${activeAgents.length}.`,
        {
          file: entity.file,
          objectId: typeof entity.data.id === "string" ? entity.data.id : undefined,
        },
      ));
    }
  }

  const aliasMap = new Map<string, { file: string; objectId?: string }[]>();
  for (const entity of active) {
    for (const alias of collectAliases(entity.data)) {
      const key = alias.trim().toLowerCase();
      if (!aliasMap.has(key)) aliasMap.set(key, []);
      aliasMap.get(key)!.push({
        file: entity.file,
        objectId: typeof entity.data.id === "string" ? entity.data.id : undefined,
      });
    }
  }

  for (const [alias, refs] of aliasMap.entries()) {
    if (refs.length < 2) continue;
    for (const ref of refs) {
      diagnostics.push(error(
        `${RULE}/duplicate-alias`,
        `Active entity alias "${alias}" is ambiguous across the registry.`,
        ref,
      ));
    }
  }

  for (const entity of store.entities) {
    if (entity.data.status !== "active") continue;
    if ((entity.data.kind === "agent" || entity.data.kind === "runtime") && !Array.isArray(entity.data.channels)) {
      diagnostics.push(warning(
        `${RULE}/missing-channels`,
        `Active ${entity.data.kind} entity should declare channels for projection and authority routing.`,
        {
          file: entity.file,
          objectId: typeof entity.data.id === "string" ? entity.data.id : undefined,
          path: "channels",
        },
      ));
    }
  }

  return diagnostics;
}
