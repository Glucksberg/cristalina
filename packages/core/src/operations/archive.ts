import type { ParsedStore } from "@cristalina/validate";
import type { Clock } from "../clock/clock.js";
import type { IdGenerator } from "../id/generator.js";
import type { ArchiveInput, PlanResult, StoreEffect, AuditEntry } from "./types.js";
import { coreFilePath } from "../store/paths.js";

export function planArchive(
  store: ParsedStore,
  input: ArchiveInput,
  clock: Clock,
  _idGen: IdGenerator,
): PlanResult {
  const target = store.coreObjects.find((o) => o.data.id === input.targetId);
  if (!target) throw new Error(`Object not found: ${input.targetId}`);

  const status = target.data.status;
  if (status === "archived") {
    throw new Error(`Object ${input.targetId} is already archived`);
  }
  if (status === "crystallized") {
    throw new Error(`Cannot archive crystallized object ${input.targetId} — supersede it first`);
  }

  const ts = clock.isoNow();
  const kind = typeof target.data.kind === "string" ? target.data.kind : "fact";

  const effects: StoreEffect[] = [
    {
      type: "update-yaml-item",
      path: coreFilePath(kind),
      id: input.targetId,
      patch: { status: "archived" },
    },
  ];

  const auditEntry: AuditEntry = {
    timestamp: ts,
    operation: "ARCHIVE",
    actor: "agent",
    targets: [input.targetId],
    produced: [],
    provenance: `archive/${input.reason ?? "no reason"}`,
    effects_summary: `Archived ${input.targetId}`,
  };

  return { effects, auditEntry, produced: [] };
}
