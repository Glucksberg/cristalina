import type { ParsedStore } from "@cristalina/validate";
import type { Clock } from "../clock/clock.js";
import type { IdGenerator } from "../id/generator.js";
import type { ConfirmInput, PlanResult, StoreEffect, AuditEntry } from "./types.js";
import { coreFilePath } from "../store/paths.js";
import { actorForAudit, enforceAuthority, resolveAuthorityContext } from "./authority.js";

export function planConfirm(
  store: ParsedStore,
  input: ConfirmInput,
  clock: Clock,
  _idGen: IdGenerator,
): PlanResult {
  const target = findObject(store, input.targetId);
  if (!target) throw new Error(`Object not found: ${input.targetId}`);

  const kind = typeof target.data.kind === "string" ? target.data.kind : "fact";
  const authority = resolveAuthorityContext(input.authority, input.authorized, input.confirmedBy);
  enforceAuthority({
    operation: "CONFIRM",
    kind,
    targetId: input.targetId,
    authority,
  });

  const ts = clock.isoNow();
  const oldConfidence = typeof target.data.confidence === "number" ? target.data.confidence : 0;
  const newConfidence = input.newConfidence ?? Math.min(oldConfidence + 0.1, 1.0);
  const oldEvidence = typeof target.data.evidence_count === "number" ? target.data.evidence_count : 0;
  const filePath = coreFilePath(kind);

  const patch: Record<string, unknown> = {
    confidence: newConfidence,
    last_confirmed_at: ts,
    confirmed_by: input.confirmedBy,
    evidence_count: oldEvidence + 1,
  };

  const effects: StoreEffect[] = [
    { type: "update-yaml-item", path: filePath, id: input.targetId, patch },
  ];

  const auditEntry: AuditEntry = {
    timestamp: ts,
    operation: "CONFIRM",
    actor: actorForAudit(authority, input.confirmedBy),
    targets: [input.targetId],
    produced: [],
    provenance: `confirm/${input.confirmedBy}`,
    effects_summary: `Confirmed ${input.targetId}: confidence ${oldConfidence} -> ${newConfidence}`,
  };

  return { effects, auditEntry, produced: [] };
}

function findObject(store: ParsedStore, id: string) {
  for (const obj of store.coreObjects) {
    if (obj.data.id === id) return obj;
  }
  return null;
}
