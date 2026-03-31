import type { ParsedStore } from "@cristalina/validate";
import type { Clock } from "../clock/clock.js";
import type { IdGenerator } from "../id/generator.js";
import type { ProposeInput, PlanResult, StoreEffect, AuditEntry } from "./types.js";
import { pendingProposalsPath } from "../store/paths.js";

export function planPropose(
  _store: ParsedStore,
  input: ProposeInput,
  clock: Clock,
  idGen: IdGenerator,
): PlanResult {
  const id = idGen.next("proposal");
  const ts = clock.isoNow();
  const dateStr = clock.dateStr();

  const proposal: Record<string, unknown> = {
    id,
    type: input.type,
    operation: input.operation,
    target_ref: input.target_ref,
    candidate_payload: input.candidate_payload,
    reason: input.reason,
    provenance: input.provenance,
    confidence: input.confidence,
    status: "pending",
    privacy_scope: input.privacy_scope,
    created_at: ts,
    created_by: input.actor ?? "agent",
  };

  if (input.policy_tags && input.policy_tags.length > 0) proposal.policy_tags = input.policy_tags;
  if (input.risk) proposal.risk = input.risk;

  const targetLabel = typeof input.target_ref.object_id === "string"
    ? input.target_ref.object_id
    : `${input.target_ref.kind ?? "object"}${input.target_ref.facet ? `:${input.target_ref.facet}` : ""}`;

  const effects: StoreEffect[] = [
    { type: "append-yaml-item", path: pendingProposalsPath(dateStr), item: proposal },
  ];

  const auditEntry: AuditEntry = {
    timestamp: ts,
    operation: "PROPOSE",
    actor: input.actor ?? "agent",
    targets: [targetLabel],
    produced: [id],
    provenance: `proposal/${input.operation}/${input.type}`,
    effects_summary: `Proposed ${input.operation} on ${targetLabel}: ${input.reason.slice(0, 80)}`,
  };

  return { effects, auditEntry, produced: [id] };
}
