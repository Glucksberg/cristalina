import type { ParsedStore } from "@cristalina/validate";
import type { Clock } from "../clock/clock.js";
import type { IdGenerator } from "../id/generator.js";
import type { ReviseInput, PlanResult, StoreEffect, AuditEntry } from "./types.js";
import { coreFilePath } from "../store/paths.js";
import { actorForAudit, enforceAuthority, resolveAuthorityContext } from "./authority.js";

export function planRevise(
  store: ParsedStore,
  input: ReviseInput,
  clock: Clock,
  _idGen: IdGenerator,
): PlanResult {
  const target = store.coreObjects.find((o) => o.data.id === input.targetId);
  if (!target) throw new Error(`Object not found: ${input.targetId}`);

  const status = target.data.status;
  if (status === "archived") {
    throw new Error(`Cannot revise archived object: ${input.targetId}`);
  }
  if (status === "crystallized") {
    throw new Error(`Cannot revise crystallized object: ${input.targetId} — supersede it instead`);
  }

  const kind = typeof target.data.kind === "string" ? target.data.kind : "fact";
  const authority = resolveAuthorityContext(input.authority, input.authorized, input.confirmedBy);
  enforceAuthority({
    operation: "REVISE",
    kind,
    targetId: input.targetId,
    authority,
  });

  const ts = clock.isoNow();

  const patch: Record<string, unknown> = {
    statement: input.newStatement,
    source_type: input.source_type,
    source_ref: input.source_ref,
    last_confirmed_at: ts,
    confirmed_by: input.confirmedBy,
  };

  const effects: StoreEffect[] = [
    { type: "update-yaml-item", path: coreFilePath(kind), id: input.targetId, patch },
  ];

  const auditEntry: AuditEntry = {
    timestamp: ts,
    operation: "REVISE",
    actor: actorForAudit(authority, input.confirmedBy),
    targets: [input.targetId],
    produced: [],
    provenance: `revise/${input.source_ref}`,
    effects_summary: `Revised ${input.targetId}: ${input.reason.slice(0, 80)}`,
  };

  return { effects, auditEntry, produced: [] };
}
