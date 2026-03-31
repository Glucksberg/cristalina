import type { ProposalOperation } from "@cristalina/types";
import type { OperationInput, OperationResult } from "../operations/types.js";

export interface CurationResponse {
  question_ref: string;
  answer_type: "accept" | "reject" | "edit" | "defer" | "uncertain";
  answer_text: string;
}

export interface RatificationInput {
  responses: CurationResponse[];
  /** Map question_ref -> proposal ID */
  questionToProposal: Map<string, string>;
  /** Deprecated compatibility field. Ratification now resolves targets from structured proposals. */
  questionToTarget?: Map<string, string>;
  /** Deprecated compatibility field. Proposal file paths are resolved from the parsed store. */
  proposalFilePath?: string;
}

export interface NormalizedDecision {
  question_ref: string;
  proposal_id: string;
  answer_type: CurationResponse["answer_type"];
  answer_text: string;
  operation: ProposalOperation;
  target_ref: Record<string, unknown>;
  candidate_payload: Record<string, unknown>;
}

export interface CanonicalOperationPlan {
  question_ref: string;
  proposal_id: string;
  operations: OperationInput[];
  proposal_status: "applied" | "rejected" | "deferred" | "pending";
}

export interface RatificationResult {
  applied: OperationResult[];
  skipped: string[];
  decisions: NormalizedDecision[];
  plans: CanonicalOperationPlan[];
}
