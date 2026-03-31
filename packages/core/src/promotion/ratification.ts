import type { ParsedObject } from "@cristalina/validate";
import { MemoryObjectKind, PrivacyScope } from "@cristalina/types";
import type { MemoryObjectKind as MemoryObjectKindType, PrivacyScope as PrivacyScopeType } from "@cristalina/types";
import type { CristalinaStore } from "../store/store.js";
import type { OperationInput, OperationResult } from "../operations/types.js";
import { executeOperation } from "../operations/index.js";

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
  operation: string;
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

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function buildSourceRef(questionRef: string): string {
  return `curation/${questionRef}`;
}

function isMemoryObjectKind(value: unknown): value is MemoryObjectKindType {
  return typeof value === "string" && MemoryObjectKind.options.includes(value as MemoryObjectKindType);
}

function isPrivacyScope(value: unknown): value is PrivacyScopeType {
  return typeof value === "string" && PrivacyScope.options.includes(value as PrivacyScopeType);
}

function normalizeDecision(
  proposal: ParsedObject,
  response: CurationResponse,
  targetObject: ParsedObject | null,
): NormalizedDecision {
  const proposalId = typeof proposal.data.id === "string" ? proposal.data.id : "unknown";
  let operation = typeof proposal.data.operation === "string" ? proposal.data.operation : "create";
  const targetRef = getRecord(proposal.data.target_ref) ?? {};
  const candidatePayload = {
    ...(getRecord(proposal.data.candidate_payload) ?? {}),
  };
  const editedText = response.answer_text.trim();
  const currentStatement = typeof targetObject?.data.statement === "string"
    ? targetObject.data.statement
    : null;

  if (
    response.answer_type === "edit"
    && editedText.length > 0
  ) {
    candidatePayload.statement = editedText;

    if (operation === "confirm" && currentStatement !== null && editedText !== currentStatement) {
      operation = "revise";
    }
  }

  return {
    question_ref: response.question_ref,
    proposal_id: proposalId,
    answer_type: response.answer_type,
    answer_text: editedText,
    operation,
    target_ref: targetRef,
    candidate_payload: candidatePayload,
  };
}

function buildOperationPlan(
  proposal: ParsedObject,
  decision: NormalizedDecision,
): CanonicalOperationPlan {
  const proposalId = decision.proposal_id;
  const targetId = typeof decision.target_ref.object_id === "string"
    ? decision.target_ref.object_id
    : null;
  const payload = decision.candidate_payload;
  const kind = isMemoryObjectKind(payload.kind) ? payload.kind : "fact";
  const statement = typeof payload.statement === "string" ? payload.statement : null;
  const confidence = typeof proposal.data.confidence === "number" ? proposal.data.confidence : 0.75;
  const privacyScope = isPrivacyScope(payload.privacy_scope)
    ? payload.privacy_scope
    : isPrivacyScope(proposal.data.privacy_scope)
      ? proposal.data.privacy_scope
      : null;
  const sourceRef = buildSourceRef(decision.question_ref);
  const reason = typeof proposal.data.reason === "string" ? proposal.data.reason : `Ratified ${proposalId}`;
  const tags = Array.isArray(payload.tags) ? payload.tags.filter((tag): tag is string => typeof tag === "string") : undefined;
  const relatedEntities = Array.isArray(payload.related_entities)
    ? payload.related_entities.filter((entity): entity is string => typeof entity === "string")
    : undefined;
  const notes = typeof payload.notes === "string" ? payload.notes : undefined;

  switch (decision.answer_type) {
    case "reject":
      return {
        question_ref: decision.question_ref,
        proposal_id: proposalId,
        proposal_status: "rejected",
        operations: [{
          op: "LOG",
          kind: "ratification_applied",
          summary: `Rejected proposal ${proposalId}: ${decision.answer_text || reason}`,
          source_type: "human_reply",
          privacy_scope: "owner_private",
          actor: "owner",
        }],
      };

    case "defer":
    case "uncertain":
      return {
        question_ref: decision.question_ref,
        proposal_id: proposalId,
        proposal_status: decision.answer_type === "defer" ? "deferred" : "pending",
        operations: [{
          op: "LOG",
          kind: "ratification_applied",
          summary: `${decision.answer_type} on proposal ${proposalId}: ${decision.answer_text || decision.question_ref}`,
          source_type: "human_reply",
          privacy_scope: "owner_private",
          actor: "owner",
        }],
      };

    case "accept":
    case "edit":
      break;
  }

  const operations: OperationInput[] = [];
  switch (decision.operation) {
    case "create":
      if (!statement || !privacyScope) {
        throw new Error(`Proposal ${proposalId} cannot create without statement and privacy_scope`);
      }
      operations.push({
        op: "CREATE",
        kind,
        statement,
        source_type: "human_reply",
        source_ref: sourceRef,
        confirmedBy: "owner",
        confidence,
        privacy_scope: privacyScope,
        tags,
        related_entities: relatedEntities,
        notes,
        authorized: true,
      });
      break;

    case "confirm":
      if (!targetId) throw new Error(`Proposal ${proposalId} cannot confirm without target_ref.object_id`);
      operations.push({
        op: "CONFIRM",
        targetId,
        confirmedBy: "owner",
        authorized: true,
      });
      break;

    case "revise":
      if (!targetId || !statement) {
        throw new Error(`Proposal ${proposalId} cannot revise without target_ref.object_id and statement`);
      }
      operations.push({
        op: "REVISE",
        targetId,
        newStatement: statement,
        reason,
        source_type: "human_reply",
        source_ref: sourceRef,
        confirmedBy: "owner",
        authorized: true,
      });
      break;

    case "supersede":
      if (!statement || !privacyScope) {
        throw new Error(`Proposal ${proposalId} cannot supersede without statement and privacy_scope`);
      }
      if (targetId) {
        operations.push({
          op: "SUPERSEDE",
          oldId: targetId,
          newStatement: statement,
          newKind: kind,
          source_type: "human_reply",
          source_ref: sourceRef,
          confirmedBy: "owner",
          confidence,
          privacy_scope: privacyScope,
          authorized: true,
        });
      } else {
        operations.push({
          op: "CREATE",
          kind,
          statement,
          source_type: "human_reply",
          source_ref: sourceRef,
          confirmedBy: "owner",
          confidence,
          privacy_scope: privacyScope,
          tags,
          related_entities: relatedEntities,
          notes,
          authorized: true,
        });
      }
      break;

    case "deprecate":
      if (!targetId) throw new Error(`Proposal ${proposalId} cannot deprecate without target_ref.object_id`);
      operations.push({
        op: "DEPRECATE",
        targetId,
        reason,
        authorized: true,
      });
      break;

    case "contradict": {
      const relatedObjectId = typeof payload.related_object_id === "string"
        ? payload.related_object_id
        : null;
      if (!targetId || !relatedObjectId) {
        throw new Error(`Proposal ${proposalId} cannot contradict without both object references`);
      }
      operations.push({
        op: "CONTRADICT",
        leftId: targetId,
        rightId: relatedObjectId,
        reason,
      });
      break;
    }

    default:
      throw new Error(`Unsupported proposal operation: ${decision.operation}`);
  }

  return {
    question_ref: decision.question_ref,
    proposal_id: proposalId,
    proposal_status: "applied",
    operations,
  };
}

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
