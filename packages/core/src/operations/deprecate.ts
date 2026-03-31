import type { ParsedStore } from "@cristalina/validate";
import type { Clock } from "../clock/clock.js";
import type { IdGenerator } from "../id/generator.js";
import type { DeprecateInput, PlanResult, StoreEffect, AuditEntry } from "./types.js";
import { coreFilePath } from "../store/paths.js";

export function planDeprecate(
  store: ParsedStore,
  input: DeprecateInput,
  clock: Clock,
  _idGen: IdGenerator,
): PlanResult {
  const target = store.coreObjects.find((o) => o.data.id === input.targetId);
  if (!target) throw new Error(`Object not found: ${input.targetId}`);

  const ts = clock.isoNow();
  const kind = typeof target.data.kind === "string" ? target.data.kind : "fact";

  const patch: Record<string, unknown> = { status: "deprecated" };
  if (input.supersededBy) {
    patch.superseded_by = [input.supersededBy];
  }

  const effects: StoreEffect[] = [
    { type: "update-yaml-item", path: coreFilePath(kind), id: input.targetId, patch },
  ];

  const auditEntry: AuditEntry = {
    timestamp: ts,
    operation: "DEPRECATE",
    actor: "agent",
    targets: [input.targetId],
    produced: [],
    provenance: `deprecate/${input.reason}`,
    effects_summary: `Deprecated ${input.targetId}: ${input.reason.slice(0, 80)}`,
  };

  return { effects, auditEntry, produced: [] };
}
