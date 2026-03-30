import type { ParsedStore } from "@cristalina/validate";
import type { Clock } from "../clock/clock.js";
import type { IdGenerator } from "../id/generator.js";
import type { OperationInput, StoreEffect, OperationResult, PlanResult } from "./types.js";
import type { CristalinaStore } from "../store/store.js";
import { planLog } from "./log.js";
import { planPropose } from "./propose.js";
import { auditLogPath } from "../store/paths.js";

/** Plan an operation: compute effects without applying them */
export function planOperation(
  store: ParsedStore,
  input: OperationInput,
  clock: Clock,
  idGen: IdGenerator,
): PlanResult {
  switch (input.op) {
    case "LOG":
      return planLog(store, input, clock, idGen);
    case "PROPOSE":
      return planPropose(store, input, clock, idGen);
    default:
      throw new Error(`Operation "${(input as OperationInput).op}" is not yet implemented`);
  }
}

/** Apply a list of effects to the store */
export function applyEffects(store: CristalinaStore, effects: StoreEffect[]): void {
  for (const effect of effects) {
    switch (effect.type) {
      case "append-jsonl":
        store.appendJsonl(effect.path, effect.data);
        break;
      case "write-yaml":
        store.writeYaml(effect.path, effect.data);
        break;
      case "append-yaml-item":
        store.appendYamlItem(effect.path, effect.item, effect.arrayKey);
        break;
      case "update-yaml-item":
        store.updateYamlItem(effect.path, effect.id, effect.patch, effect.arrayKey);
        break;
      case "append-log":
        store.appendLog(effect.path, effect.line);
        break;
      default: {
        const _exhaustive: never = effect;
        throw new Error(`Unhandled effect type: ${(_exhaustive as StoreEffect).type}`);
      }
    }
  }
}

/** Execute an operation: plan, apply effects, write audit entry */
export async function executeOperation(
  store: CristalinaStore,
  input: OperationInput,
): Promise<OperationResult> {
  const snapshot = await store.read();
  const clock = store.clock;
  const idGen = store.idGen;

  const { effects, auditEntry, produced } = planOperation(snapshot, input, clock, idGen);

  // Apply all effects
  applyEffects(store, effects);

  // Write audit entry
  store.appendLog(auditLogPath(), JSON.stringify(auditEntry));

  return {
    operation: auditEntry.operation,
    timestamp: auditEntry.timestamp,
    actor: auditEntry.actor,
    targets: auditEntry.targets,
    produced,
    effects,
    auditEntry,
  };
}
