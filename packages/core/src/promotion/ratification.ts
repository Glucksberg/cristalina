import type { ParsedObject } from "@cristalina/validate";
import type { CristalinaStore } from "../store/store.js";
import type { OperationResult } from "../operations/types.js";
import type { OperationInput } from "../operations/types.js";
import { executeOperation } from "../operations/index.js";
import { buildOperationPlan, normalizeDecision } from "./ratification-operations.js";
import { resolvePolicyBundle } from "../policy/resolver.js";
import type {
  CanonicalOperationPlan,
  CurationResponse,
  NormalizedDecision,
  RatificationInput,
  RatificationResult,
} from "./ratification-types.js";

export type {
  CanonicalOperationPlan,
  CurationResponse,
  NormalizedDecision,
  RatificationInput,
  RatificationResult,
} from "./ratification-types.js";

function updateProposalStatus(store: CristalinaStore, proposal: ParsedObject, status: CanonicalOperationPlan["proposal_status"]): void {
  const proposalId = typeof proposal.data.id === "string" ? proposal.data.id : null;
  if (!proposalId) return;
  store.updateYamlItem(proposal.file, proposalId, { status });
}

function touchedObjectIds(operation: OperationInput): string[] {
  switch (operation.op) {
    case "CONFIRM":
    case "REVISE":
    case "DEPRECATE":
    case "CRYSTALLIZE":
    case "ARCHIVE":
      return [operation.targetId];
    case "SUPERSEDE":
      return [operation.oldId];
    case "CONTRADICT":
      return [operation.leftId, operation.rightId];
    default:
      return [];
  }
}

function assertNoConflictingBatchPlans(plans: CanonicalOperationPlan[]): void {
  const ownerByObjectId = new Map<string, string>();

  for (const plan of plans) {
    if (plan.proposal_status !== "applied") continue;

    for (const operation of plan.operations) {
      if (operation.op === "LOG" || operation.op === "CREATE" || operation.op === "PROPOSE" || operation.op === "EXTEND") {
        continue;
      }

      for (const objectId of touchedObjectIds(operation)) {
        const existing = ownerByObjectId.get(objectId);
        if (existing && existing !== plan.proposal_id) {
          throw new Error(
            `Conflicting ratification batch: proposals ${existing} and ${plan.proposal_id} both modify ${objectId}`,
          );
        }
        ownerByObjectId.set(objectId, plan.proposal_id);
      }
    }
  }
}

/**
 * Apply owner responses from a curation packet.
 * Responses are first normalized against the proposal contract, then turned into
 * explicit operation plans, then executed and audited via the regular operation layer.
 */
export async function applyRatification(
  store: CristalinaStore,
  input: RatificationInput,
): Promise<RatificationResult> {
  const applied: OperationResult[] = [];
  const skipped: string[] = [];
  const decisions: NormalizedDecision[] = [];
  const plans: CanonicalOperationPlan[] = [];
  const snapshot = await store.read();
  const policies = resolvePolicyBundle(snapshot);
  const pendingExecutions: Array<{ proposal: ParsedObject; plan: CanonicalOperationPlan }> = [];

  for (const response of input.responses) {
    const proposalId = input.questionToProposal.get(response.question_ref);
    if (!proposalId) {
      skipped.push(response.question_ref);
      continue;
    }

    const proposal = await store.findById(proposalId);
    if (!proposal) {
      skipped.push(response.question_ref);
      continue;
    }

    const targetObjectId = typeof proposal.data.target_ref === "object" && proposal.data.target_ref !== null
      && typeof (proposal.data.target_ref as Record<string, unknown>).object_id === "string"
      ? (proposal.data.target_ref as Record<string, unknown>).object_id as string
      : null;
    const targetObject = targetObjectId ? await store.findById(targetObjectId) : null;

    const decision = normalizeDecision(proposal, response, targetObject);
    const plan = buildOperationPlan(proposal, decision, targetObject, {
      promotion: policies.promotion,
      audience: policies.audience,
    });

    decisions.push(decision);
    plans.push(plan);
    pendingExecutions.push({ proposal, plan });
  }

  assertNoConflictingBatchPlans(plans);

  for (const { proposal, plan } of pendingExecutions) {
    for (const operation of plan.operations) {
      const result = await executeOperation(store, operation);
      applied.push(result);
    }

    updateProposalStatus(store, proposal, plan.proposal_status);
  }

  return { applied, skipped, decisions, plans };
}
