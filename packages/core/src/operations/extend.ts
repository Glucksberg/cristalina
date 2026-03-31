import type { ParsedStore } from "@cristalina/validate";
import type { Clock } from "../clock/clock.js";
import type { IdGenerator } from "../id/generator.js";
import type { ExtendInput, PlanResult, StoreEffect, AuditEntry } from "./types.js";
import { coreFilePath } from "../store/paths.js";

export function planExtend(
  store: ParsedStore,
  input: ExtendInput,
  clock: Clock,
  _idGen: IdGenerator,
): PlanResult {
  const target = store.coreObjects.find((o) => o.data.id === input.targetId);
  if (!target) throw new Error(`Object not found: ${input.targetId}`);

  const ts = clock.isoNow();
  const kind = typeof target.data.kind === "string" ? target.data.kind : "fact";
  const oldEvidence = typeof target.data.evidence_count === "number" ? target.data.evidence_count : 0;
  const oldConfidence = typeof target.data.confidence === "number" ? target.data.confidence : 0;
  const newConfidence = input.newConfidence ?? Math.min(oldConfidence + 0.05 * input.additionalEvidence.length, 1.0);

  const patch: Record<string, unknown> = {
    evidence_count: oldEvidence + input.additionalEvidence.length,
    confidence: newConfidence,
    last_confirmed_at: ts,
  };

  const effects: StoreEffect[] = [
    { type: "update-yaml-item", path: coreFilePath(kind), id: input.targetId, patch },
  ];

  const auditEntry: AuditEntry = {
    timestamp: ts,
    operation: "EXTEND",
    actor: "agent",
    targets: [input.targetId],
    produced: [],
    provenance: `extend/${input.additionalEvidence.join(",")}`,
    effects_summary: `Extended ${input.targetId}: +${input.additionalEvidence.length} evidence, confidence -> ${newConfidence}`,
  };

  return { effects, auditEntry, produced: [] };
}
