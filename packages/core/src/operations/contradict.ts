import type { ParsedStore } from "@cristalina/validate";
import type { Clock } from "../clock/clock.js";
import type { IdGenerator } from "../id/generator.js";
import type { ContradictInput, PlanResult, StoreEffect, AuditEntry } from "./types.js";
import { contradictionFilePath, coreFilePath } from "../store/paths.js";

export function planContradict(
  store: ParsedStore,
  input: ContradictInput,
  clock: Clock,
  idGen: IdGenerator,
): PlanResult {
  // Verify both sides exist
  const left = store.coreObjects.find((o) => o.data.id === input.leftId);
  const right = store.coreObjects.find((o) => o.data.id === input.rightId);
  if (!left) throw new Error(`Left object not found: ${input.leftId}`);
  if (!right) throw new Error(`Right object not found: ${input.rightId}`);

  const id = idGen.next("contradiction");
  const ts = clock.isoNow();

  const contradiction: Record<string, unknown> = {
    id,
    left: input.leftId,
    right: input.rightId,
    reason: input.reason,
    status: "open",
    opened_at: ts,
    requires_human_review: true,
  };
  if (input.priority) contradiction.priority = input.priority;

  const leftKind = typeof left.data.kind === "string" ? left.data.kind : "fact";
  const rightKind = typeof right.data.kind === "string" ? right.data.kind : "fact";

  const effects: StoreEffect[] = [
    { type: "append-yaml-item", path: contradictionFilePath(), item: contradiction },
    { type: "update-yaml-item", path: coreFilePath(leftKind), id: input.leftId, patch: { status: "disputed" } },
    { type: "update-yaml-item", path: coreFilePath(rightKind), id: input.rightId, patch: { status: "disputed" } },
  ];

  const auditEntry: AuditEntry = {
    timestamp: ts,
    operation: "CONTRADICT",
    actor: "agent",
    targets: [input.leftId, input.rightId],
    produced: [id],
    provenance: `contradiction/${input.leftId}+${input.rightId}`,
    effects_summary: `Contradiction ${id}: ${input.leftId} vs ${input.rightId}`,
  };

  return { effects, auditEntry, produced: [id] };
}
