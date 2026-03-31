import type { ParsedObject } from "@cristalina/validate";
import type { CristalinaStore } from "../store/store.js";
import type { OperationResult } from "../operations/types.js";
import { executeOperation } from "../operations/index.js";
import { buildOperationPlan, normalizeDecision } from "./ratification-operations.js";
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
    const plan = buildOperationPlan(proposal, decision);

    decisions.push(decision);
    plans.push(plan);

    for (const operation of plan.operations) {
      const result = await executeOperation(store, operation);
      applied.push(result);
    }

    updateProposalStatus(store, proposal, plan.proposal_status);
  }

  return { applied, skipped, decisions, plans };
}
