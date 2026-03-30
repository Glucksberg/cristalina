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
    target: input.target,
    reason: input.reason,
    supporting_events: input.supporting_events,
    confidence: input.confidence,
    status: "pending",
    privacy_scope: input.privacy_scope,
    created_at: ts,
    created_by: input.actor ?? "agent",
  };

  if (input.impact_level) proposal.impact_level = input.impact_level;
  if (input.requires_human_approval !== undefined) proposal.requires_human_approval = input.requires_human_approval;
  if (input.question_candidate) proposal.question_candidate = input.question_candidate;

  const effects: StoreEffect[] = [
    { type: "append-yaml-item", path: pendingProposalsPath(dateStr), item: proposal },
  ];

  const auditEntry: AuditEntry = {
    timestamp: ts,
    operation: "PROPOSE",
    actor: input.actor ?? "agent",
    targets: [input.target],
    produced: [id],
    provenance: `proposal/${input.type}`,
    effects_summary: `Proposed ${input.type}: ${input.reason.slice(0, 80)}`,
  };

  return { effects, auditEntry, produced: [id] };
}
