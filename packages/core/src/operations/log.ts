import type { ParsedStore } from "@cristalina/validate";
import type { Clock } from "../clock/clock.js";
import type { IdGenerator } from "../id/generator.js";
import type { LogInput, PlanResult, StoreEffect, AuditEntry } from "./types.js";
import { eventFilePath } from "../store/paths.js";

export function planLog(
  _store: ParsedStore,
  input: LogInput,
  clock: Clock,
  idGen: IdGenerator,
): PlanResult {
  const id = idGen.next("event");
  const ts = clock.isoNow();
  const dateStr = clock.dateStr();

  const event: Record<string, unknown> = {
    id,
    kind: input.kind,
    ts,
    summary: input.summary,
    source_type: input.source_type,
    privacy_scope: input.privacy_scope,
  };

  if (input.actor) event.actor = input.actor;
  if (input.session_id) event.session_id = input.session_id;
  if (input.project) event.project = input.project;
  if (input.related_entities) event.related_entities = input.related_entities;
  if (input.tags) event.tags = input.tags;
  if (input.details !== undefined) event.details = input.details;

  const effects: StoreEffect[] = [
    { type: "append-jsonl", path: eventFilePath(dateStr), data: event },
  ];

  const auditEntry: AuditEntry = {
    timestamp: ts,
    operation: "LOG",
    actor: input.actor ?? "agent",
    targets: [],
    produced: [id],
    provenance: `event/${input.kind}`,
    effects_summary: `Logged ${input.kind} event: ${input.summary.slice(0, 80)}`,
  };

  return { effects, auditEntry, produced: [id] };
}
