import type { Diagnostic } from "../diagnostics.js";
import { warning } from "../diagnostics.js";
import type { ParsedStore } from "../store/reader.js";

const RULE = "stable-references";

export function stableReferences(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const canonicalIds = new Set(
    store.coreObjects
      .map((obj) => typeof obj.data.id === "string" ? obj.data.id : null)
      .filter((id): id is string => id !== null),
  );
  const entityIds = new Set(
    store.entities
      .map((obj) => typeof obj.data.id === "string" ? obj.data.id : null)
      .filter((id): id is string => id !== null),
  );

  for (const obj of store.coreObjects) {
    for (const entityId of collectEntityRefs(obj.data.related_entities)) {
      if (!entityIds.has(entityId)) {
        diagnostics.push(
          warning(RULE, `Object references missing entity "${entityId}" outside the entity registry.`, {
            file: obj.file,
            objectId: typeof obj.data.id === "string" ? obj.data.id : undefined,
            path: "related_entities",
          }),
        );
      }
    }

    if (obj.data.kind !== "relationship") continue;

    const hasFromRef = typeof obj.data.from_ref === "object" && obj.data.from_ref !== null;
    const hasToRef = typeof obj.data.to_ref === "object" && obj.data.to_ref !== null;
    const hasLegacyFrom = typeof obj.data.from === "string";
    const hasLegacyTo = typeof obj.data.to === "string";

    if (!hasFromRef && hasLegacyFrom) {
      diagnostics.push(
        warning(RULE, "Relationship still relies on legacy textual from endpoint; add from_ref.", {
          file: obj.file,
          objectId: typeof obj.data.id === "string" ? obj.data.id : undefined,
          path: "from_ref",
        }),
      );
    }

    if (!hasToRef && hasLegacyTo) {
      diagnostics.push(
        warning(RULE, "Relationship still relies on legacy textual to endpoint; add to_ref.", {
          file: obj.file,
          objectId: typeof obj.data.id === "string" ? obj.data.id : undefined,
          path: "to_ref",
        }),
      );
    }

    validateStableRef(obj.file, typeof obj.data.id === "string" ? obj.data.id : undefined, "from_ref", obj.data.from_ref, canonicalIds, entityIds, diagnostics);
    validateStableRef(obj.file, typeof obj.data.id === "string" ? obj.data.id : undefined, "to_ref", obj.data.to_ref, canonicalIds, entityIds, diagnostics);
  }

  for (const obj of store.proposals) {
    validateStableRef(obj.file, typeof obj.data.id === "string" ? obj.data.id : undefined, "target_ref", obj.data.target_ref, canonicalIds, entityIds, diagnostics);

    for (const entityId of collectEntityRefs((obj.data.candidate_payload as Record<string, unknown> | undefined)?.related_entities)) {
      if (!entityIds.has(entityId)) {
        diagnostics.push(
          warning(RULE, `Proposal references missing entity "${entityId}" outside the entity registry.`, {
            file: obj.file,
            objectId: typeof obj.data.id === "string" ? obj.data.id : undefined,
            path: "candidate_payload.related_entities",
          }),
        );
      }
    }
  }

  return diagnostics;
}

function collectEntityRefs(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function validateStableRef(
  file: string,
  objectId: string | undefined,
  path: string,
  refValue: unknown,
  canonicalIds: Set<string>,
  entityIds: Set<string>,
  diagnostics: Diagnostic[],
): void {
  if (typeof refValue !== "object" || refValue === null) return;
  const ref = refValue as Record<string, unknown>;

  if (typeof ref.object_id === "string" && !canonicalIds.has(ref.object_id)) {
    diagnostics.push(
      warning(RULE, `Stable reference points to missing canonical object "${ref.object_id}".`, {
        file,
        objectId,
        path: `${path}.object_id`,
      }),
    );
  }

  if (typeof ref.entity_id === "string" && !entityIds.has(ref.entity_id)) {
    diagnostics.push(
      warning(RULE, `Stable reference points to missing entity "${ref.entity_id}".`, {
        file,
        objectId,
        path: `${path}.entity_id`,
      }),
    );
  }
}
