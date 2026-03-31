import type { ParsedStore } from "@cristalina/validate";
import type { Clock } from "../clock/clock.js";
import type { IdGenerator } from "../id/generator.js";
import type { SupersedeInput, PlanResult, StoreEffect, AuditEntry } from "./types.js";
import { coreFilePath } from "../store/paths.js";

export function planSupersede(
  store: ParsedStore,
  input: SupersedeInput,
  clock: Clock,
  idGen: IdGenerator,
): PlanResult {
  const old = store.coreObjects.find((o) => o.data.id === input.oldId);
  if (!old) throw new Error(`Object not found: ${input.oldId}`);

  const ts = clock.isoNow();
  const oldKind = typeof old.data.kind === "string" ? old.data.kind : "fact";
  const newKind = input.newKind ?? oldKind;
  const newId = idGen.next("fact");

  const newObject: Record<string, unknown> = {
    id: newId,
    kind: newKind,
    statement: input.newStatement,
    status: "ratified",
    confidence: input.confidence,
    source_type: input.source_type,
    source_ref: input.source_ref,
    created_at: ts,
    last_confirmed_at: ts,
    confirmed_by: input.confirmedBy,
    evidence_count: 1,
    privacy_scope: input.privacy_scope,
    supersedes: [input.oldId],
  };

  const effects: StoreEffect[] = [
    // Deprecate the old object
    {
      type: "update-yaml-item",
      path: coreFilePath(oldKind),
      id: input.oldId,
      patch: { status: "deprecated", superseded_by: [newId] },
    },
    // Create the new object
    {
      type: "append-yaml-item",
      path: coreFilePath(newKind),
      item: newObject,
    },
  ];

  const auditEntry: AuditEntry = {
    timestamp: ts,
    operation: "SUPERSEDE",
    actor: input.confirmedBy,
    targets: [input.oldId],
    produced: [newId],
    provenance: `supersede/${input.source_ref}`,
    effects_summary: `Superseded ${input.oldId} with ${newId}: ${input.newStatement.slice(0, 60)}`,
  };

  return { effects, auditEntry, produced: [newId] };
}
