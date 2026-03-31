import type { ParsedStore } from "@cristalina/validate";
import type { Clock } from "../clock/clock.js";
import type { IdGenerator } from "../id/generator.js";
import type { CrystallizeInput, PlanResult, StoreEffect, AuditEntry } from "./types.js";
import { coreFilePath } from "../store/paths.js";
import { actorForAudit, enforceAuthority, resolveAuthorityContext } from "./authority.js";

export function planCrystallize(
  store: ParsedStore,
  input: CrystallizeInput,
  clock: Clock,
  _idGen: IdGenerator,
): PlanResult {
  const target = store.coreObjects.find((o) => o.data.id === input.targetId);
  if (!target) throw new Error(`Object not found: ${input.targetId}`);

  const kind = typeof target.data.kind === "string" ? target.data.kind : "fact";
  const authority = resolveAuthorityContext(input.authority, input.authorized);
  enforceAuthority({
    operation: "CRYSTALLIZE",
    kind,
    targetId: input.targetId,
    authority,
  });

  const confidence = typeof target.data.confidence === "number" ? target.data.confidence : 0;
  if (confidence < 0.95) {
    throw new Error(
      `Cannot crystallize ${input.targetId}: confidence ${confidence} < 0.95`,
    );
  }

  const status = target.data.status;
  if (status !== "ratified") {
    throw new Error(
      `Cannot crystallize ${input.targetId}: status is "${status}", must be "ratified"`,
    );
  }

  const ts = clock.isoNow();

  const effects: StoreEffect[] = [
    {
      type: "update-yaml-item",
      path: coreFilePath(kind),
      id: input.targetId,
      patch: { status: "crystallized", last_confirmed_at: ts },
    },
  ];

  const auditEntry: AuditEntry = {
    timestamp: ts,
    operation: "CRYSTALLIZE",
    actor: actorForAudit(authority, "system"),
    targets: [input.targetId],
    produced: [],
    provenance: `crystallize/confidence=${confidence}`,
    effects_summary: `Crystallized ${input.targetId} (confidence: ${confidence})`,
  };

  return { effects, auditEntry, produced: [] };
}
