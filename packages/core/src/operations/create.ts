import type { ParsedStore } from "@cristalina/validate";
import type { Clock } from "../clock/clock.js";
import type { IdGenerator, PrefixKey } from "../id/generator.js";
import type { CreateInput, PlanResult, StoreEffect, AuditEntry } from "./types.js";
import { coreFilePath } from "../store/paths.js";
import { actorForAudit, enforceAuthority, resolveAuthorityContext } from "./authority.js";

const KIND_TO_PREFIX: Record<string, PrefixKey> = {
  fact: "fact",
  preference: "fact",
  constraint: "fact",
  project: "fact",
  belief: "fact",
  value: "value",
  priority: "value",
  identity_trait: "identityTrait",
  style_rule: "styleRule",
  relationship: "relationship",
};

export function planCreate(
  _store: ParsedStore,
  input: CreateInput,
  clock: Clock,
  idGen: IdGenerator,
): PlanResult {
  const authority = resolveAuthorityContext(input.authority, input.authorized, input.confirmedBy);
  enforceAuthority({
    operation: "CREATE",
    kind: input.kind,
    targetId: `${input.kind}:new`,
    authority,
  });

  const ts = clock.isoNow();
  const newId = idGen.next(KIND_TO_PREFIX[input.kind] ?? "fact");

  const newObject: Record<string, unknown> = {
    id: newId,
    kind: input.kind,
    statement: input.statement,
    status: "ratified",
    confidence: input.confidence,
    source_type: input.source_type,
    source_ref: input.source_ref,
    created_at: ts,
    last_confirmed_at: ts,
    confirmed_by: input.confirmedBy,
    evidence_count: 1,
    privacy_scope: input.privacy_scope,
  };

  if (input.tags && input.tags.length > 0) newObject.tags = input.tags;
  if (input.related_entities && input.related_entities.length > 0) newObject.related_entities = input.related_entities;
  if (input.notes) newObject.notes = input.notes;

  const effects: StoreEffect[] = [
    {
      type: "append-yaml-item",
      path: coreFilePath(input.kind),
      item: newObject,
    },
  ];

  const auditEntry: AuditEntry = {
    timestamp: ts,
    operation: "CREATE",
    actor: actorForAudit(authority, input.confirmedBy),
    targets: [],
    produced: [newId],
    provenance: `create/${input.source_ref}`,
    effects_summary: `Created ${input.kind} ${newId}: ${input.statement.slice(0, 60)}`,
  };

  return { effects, auditEntry, produced: [newId] };
}
