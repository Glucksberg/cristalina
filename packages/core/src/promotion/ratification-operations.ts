import type { ParsedObject } from "@cristalina/validate";
import { MemoryObjectKind, PrivacyScope, ProposalOperation } from "@cristalina/types";
import type {
  EntityId,
  MemoryObjectKind as MemoryObjectKindType,
  PrivacyScope as PrivacyScopeType,
  ProposalOperation as ProposalOperationType,
  ProposalType as ProposalTypeType,
} from "@cristalina/types";
import type { OperationInput } from "../operations/types.js";
import type { AudiencePolicyConfig, PromotionPolicy } from "../policy/runtime.js";
import type {
  CanonicalOperationPlan,
  CurationResponse,
  NormalizedDecision,
} from "./ratification-types.js";
import { assertProposalTypeSemantics, requireProposalType } from "./proposal-type-policy.js";
import {
  approvalReasonsForProposal,
  getProposalPolicyTags,
  getSupportingEvents,
  privacyAudienceExpansionForProposal,
  requiresHumanApproval,
} from "./policy.js";
import { DEFAULT_AUDIENCE_POLICY, DEFAULT_PROMOTION_POLICY } from "../policy/runtime.js";

interface DecisionSeed {
  proposalId: string;
  proposalType: ProposalTypeType;
  operation: ProposalOperationType;
  targetRef: Record<string, unknown>;
  candidatePayload: Record<string, unknown>;
  editedText: string;
  currentStatement: string | null;
}

interface NormalizationContext {
  response: CurationResponse;
  seed: DecisionSeed;
}

interface PlanningContext {
  proposalId: string;
  proposalType: ProposalTypeType;
  proposalOperation: ProposalOperationType;
  targetId: string | null;
  targetPrivacyScope: PrivacyScopeType | null;
  candidatePrivacyScope: PrivacyScopeType | null;
  privacyExpansionAudiences: PrivacyScopeType[];
  payload: Record<string, unknown>;
  kind: MemoryObjectKindType;
  statement: string | null;
  confidence: number;
  privacyScope: PrivacyScopeType | null;
  sourceRef: string;
  reason: string;
  policyTags: string[];
  supportingEvents: string[];
  approvalReasons: string[];
  requiresExplicitApproval: boolean;
  tags?: string[];
  relatedEntities?: EntityId[];
  notes?: string;
  followUpPayloads: Array<{
    kind: MemoryObjectKindType;
    statement: string;
    privacy_scope: PrivacyScopeType;
    tags?: string[];
    related_entities?: EntityId[];
    notes?: string;
  }>;
}

interface RatificationOperationHandler {
  normalize(context: NormalizationContext): NormalizedDecision;
  buildOperations(context: PlanningContext): OperationInput[];
}

const OWNER_RATIFICATION_AUTHORITY = {
  actor_id: "owner",
  actor_role: "owner",
  runtime: "curation",
  channel: "owner_private_dm",
  authorized: true,
} as const;

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

function isProposalOperation(value: unknown): value is ProposalOperationType {
  return typeof value === "string" && ProposalOperation.options.includes(value as ProposalOperationType);
}

function buildDecisionSeed(
  proposal: ParsedObject,
  response: CurationResponse,
  targetObject: ParsedObject | null,
): DecisionSeed {
  const proposalId = typeof proposal.data.id === "string" ? proposal.data.id : "unknown";
  const proposalType = requireProposalType(proposal.data.type, `Proposal ${proposalId}`);
  const operation = isProposalOperation(proposal.data.operation)
    ? proposal.data.operation
    : "create";
  const candidatePayload = {
    ...(getRecord(proposal.data.candidate_payload) ?? {}),
  };
  const kind = isMemoryObjectKind(candidatePayload.kind) ? candidatePayload.kind : null;

  assertProposalTypeSemantics(
    proposalType,
    operation,
    kind,
    `Proposal ${proposalId}`,
  );

  return {
    proposalId,
    proposalType,
    operation,
    targetRef: getRecord(proposal.data.target_ref) ?? {},
    candidatePayload,
    editedText: response.answer_text.trim(),
    currentStatement: typeof targetObject?.data.statement === "string"
      ? targetObject.data.statement
      : null,
  };
}

function buildDecision(
  response: CurationResponse,
  seed: DecisionSeed,
  operation = seed.operation,
  candidatePayload = seed.candidatePayload,
): NormalizedDecision {
  return {
    question_ref: response.question_ref,
    proposal_id: seed.proposalId,
    answer_type: response.answer_type,
    answer_text: seed.editedText,
    operation,
    target_ref: seed.targetRef,
    candidate_payload: candidatePayload,
  };
}

interface ParsedEditSegment {
  kind: MemoryObjectKindType;
  privacy_scope: PrivacyScopeType;
  statement: string;
}

function parseEditSegment(
  raw: string,
  fallbackKind: MemoryObjectKindType,
  fallbackScope: PrivacyScopeType | null,
): ParsedEditSegment | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || !fallbackScope) return null;

  const taggedMatch = trimmed.match(/^\[(?<kind>[a-z_]+)\](?:\[(?<scope>[a-z_]+)\])?\s+(?<statement>.+)$/);
  if (taggedMatch?.groups) {
    const kind = isMemoryObjectKind(taggedMatch.groups.kind) ? taggedMatch.groups.kind : fallbackKind;
    const scope = isPrivacyScope(taggedMatch.groups.scope) ? taggedMatch.groups.scope : fallbackScope;
    const statement = taggedMatch.groups.statement.trim();
    if (!statement.length) return null;

    return {
      kind,
      privacy_scope: scope,
      statement,
    };
  }

  const namespacedMatch = trimmed.match(/^(?<kind>[a-z_]+)(?:\s*\[(?<scope>[a-z_]+)\])?\s*:\s*(?<statement>.+)$/);
  if (!namespacedMatch?.groups) {
    return {
      kind: fallbackKind,
      privacy_scope: fallbackScope,
      statement: trimmed,
    };
  }

  const kind = isMemoryObjectKind(namespacedMatch.groups.kind) ? namespacedMatch.groups.kind : fallbackKind;
  const scope = isPrivacyScope(namespacedMatch.groups.scope) ? namespacedMatch.groups.scope : fallbackScope;
  const statement = namespacedMatch.groups.statement.trim();
  if (!statement.length) return null;

  return {
    kind,
    privacy_scope: scope,
    statement,
  };
}

function parseStructuredEditAnswer(
  editedText: string,
  fallbackKind: MemoryObjectKindType,
  fallbackScope: PrivacyScopeType | null,
): { primary: ParsedEditSegment; followUps: ParsedEditSegment[] } | null {
  const trimmed = editedText.trim();
  if (!trimmed.includes("\n")) return null;

  const lines = trimmed.split(/\r?\n/);
  const prelude: string[] = [];
  const bulletLines: string[] = [];

  for (const line of lines) {
    const bullet = line.match(/^\s*(?:[-*]|\d+\.)\s+(.+)$/);
    if (bullet) {
      bulletLines.push(bullet[1]);
    } else if (bulletLines.length === 0 && line.trim().length > 0) {
      prelude.push(line.trim());
    } else if (line.trim().length > 0) {
      bulletLines.push(line.trim());
    }
  }

  if (bulletLines.length === 0) return null;

  const segments: ParsedEditSegment[] = [];
  if (prelude.length > 0) {
    const primary = parseEditSegment(prelude.join(" "), fallbackKind, fallbackScope);
    if (primary) segments.push(primary);
  }

  for (const bullet of bulletLines) {
    const segment = parseEditSegment(bullet, fallbackKind, fallbackScope);
    if (segment) segments.push(segment);
  }

  if (segments.length < 2) return null;

  return {
    primary: segments[0],
    followUps: segments.slice(1),
  };
}

function withEditedStatement(context: NormalizationContext, operation = context.seed.operation): NormalizedDecision {
  if (context.response.answer_type !== "edit" || context.seed.editedText.length === 0) {
    return buildDecision(context.response, context.seed, operation);
  }

  const fallbackKind = isMemoryObjectKind(context.seed.candidatePayload.kind)
    ? context.seed.candidatePayload.kind
    : "fact";
  const fallbackScope = isPrivacyScope(context.seed.candidatePayload.privacy_scope)
    ? context.seed.candidatePayload.privacy_scope
    : null;
  const structured = parseStructuredEditAnswer(
    context.seed.editedText,
    fallbackKind,
    fallbackScope,
  );

  if (structured) {
    return buildDecision(
      context.response,
      context.seed,
      operation,
      {
        ...context.seed.candidatePayload,
        kind: structured.primary.kind,
        privacy_scope: structured.primary.privacy_scope,
        statement: structured.primary.statement,
        follow_up_payloads: structured.followUps,
      },
    );
  }

  return buildDecision(
    context.response,
    context.seed,
    operation,
    {
      ...context.seed.candidatePayload,
      statement: context.seed.editedText,
    },
  );
}

function buildPlanningContext(
  proposal: ParsedObject,
  decision: NormalizedDecision,
  targetObject: ParsedObject | null = null,
  policies: {
    promotion?: PromotionPolicy;
    audience?: AudiencePolicyConfig;
  } = {},
): PlanningContext {
  const payload = decision.candidate_payload;
  const proposalId = decision.proposal_id;
  const proposalType = requireProposalType(proposal.data.type, `Proposal ${proposalId}`);
  const candidatePrivacyScope = isPrivacyScope(payload.privacy_scope)
    ? payload.privacy_scope
    : isPrivacyScope(proposal.data.privacy_scope)
      ? proposal.data.privacy_scope
      : null;
  const targetPrivacyScope = isPrivacyScope(targetObject?.data.privacy_scope)
    ? targetObject.data.privacy_scope
    : null;

  return {
    proposalId,
    proposalType,
    proposalOperation: isProposalOperation(proposal.data.operation) ? proposal.data.operation : decision.operation,
    targetId: typeof decision.target_ref.object_id === "string"
      ? decision.target_ref.object_id
      : null,
    targetPrivacyScope,
    candidatePrivacyScope,
    privacyExpansionAudiences: privacyAudienceExpansionForProposal(
      proposal,
      targetObject,
      policies.audience ?? DEFAULT_AUDIENCE_POLICY,
    ),
    payload,
    kind: isMemoryObjectKind(payload.kind) ? payload.kind : "fact",
    statement: typeof payload.statement === "string" ? payload.statement : null,
    confidence: typeof proposal.data.confidence === "number" ? proposal.data.confidence : 0.75,
    privacyScope: candidatePrivacyScope,
    sourceRef: buildSourceRef(decision.question_ref),
    reason: typeof proposal.data.reason === "string"
      ? proposal.data.reason
      : `Ratified ${proposalId}`,
    policyTags: getProposalPolicyTags(proposal),
    supportingEvents: getSupportingEvents(proposal),
    approvalReasons: approvalReasonsForProposal(
      proposal,
      policies.promotion ?? DEFAULT_PROMOTION_POLICY,
      targetObject,
      policies.audience ?? DEFAULT_AUDIENCE_POLICY,
    ),
    requiresExplicitApproval: requiresHumanApproval(
      proposal,
      policies.promotion ?? DEFAULT_PROMOTION_POLICY,
      targetObject,
      policies.audience ?? DEFAULT_AUDIENCE_POLICY,
    ),
    tags: Array.isArray(payload.tags)
      ? payload.tags.filter((tag): tag is string => typeof tag === "string")
      : undefined,
    relatedEntities: Array.isArray(payload.related_entities)
      ? payload.related_entities.filter((entity): entity is EntityId => typeof entity === "string")
      : undefined,
    notes: typeof payload.notes === "string" ? payload.notes : undefined,
    followUpPayloads: Array.isArray(payload.follow_up_payloads)
      ? payload.follow_up_payloads.flatMap((entry) => {
          const record = getRecord(entry);
          if (!record) return [];
          if (!isMemoryObjectKind(record.kind)) return [];
          if (typeof record.statement !== "string" || !isPrivacyScope(record.privacy_scope)) return [];
          return [{
            kind: record.kind,
            statement: record.statement,
            privacy_scope: record.privacy_scope,
            tags: Array.isArray(record.tags)
              ? record.tags.filter((tag): tag is string => typeof tag === "string")
              : undefined,
            related_entities: Array.isArray(record.related_entities)
              ? record.related_entities.filter((entity): entity is EntityId => typeof entity === "string")
              : undefined,
            notes: typeof record.notes === "string" ? record.notes : undefined,
          }];
        })
      : [],
  };
}

function buildRatificationAuditLog(
  context: PlanningContext,
  decision: NormalizedDecision,
  proposalStatus: CanonicalOperationPlan["proposal_status"],
): OperationInput {
  return {
    op: "LOG",
    kind: "ratification_applied",
    summary: `${proposalStatus} proposal ${context.proposalId} (${context.proposalType}/${context.proposalOperation} -> ${decision.operation})`,
    source_type: "human_reply",
    privacy_scope: "owner_private",
    actor: "owner",
    tags: context.policyTags.length > 0 ? context.policyTags : undefined,
    details: {
      question_ref: decision.question_ref,
      answer_type: decision.answer_type,
      answer_text: decision.answer_text,
      proposal_type: context.proposalType,
      proposal_operation: context.proposalOperation,
      applied_operation: decision.operation,
      supporting_events: context.supportingEvents,
      supporting_event_count: context.supportingEvents.length,
      policy_tags: context.policyTags,
      approval_reasons: context.approvalReasons,
      requires_human_approval: context.requiresExplicitApproval,
      target_privacy_scope: context.targetPrivacyScope,
      candidate_privacy_scope: context.candidatePrivacyScope,
      privacy_expansion_audiences: context.privacyExpansionAudiences,
    },
  };
}

function buildCreateOperation(context: PlanningContext): OperationInput {
  if (!context.statement || !context.privacyScope) {
    throw new Error(`Proposal ${context.proposalId} cannot create without statement and privacy_scope`);
  }

  return {
    op: "CREATE",
    kind: context.kind,
    statement: context.statement,
    source_type: "human_reply",
    source_ref: context.sourceRef,
    confirmedBy: "owner",
    confidence: context.confidence,
    privacy_scope: context.privacyScope,
    tags: context.tags,
    related_entities: context.relatedEntities,
    notes: context.notes,
    authority: OWNER_RATIFICATION_AUTHORITY,
    authorized: true,
  };
}

function buildCreateOperationFromPayload(
  context: PlanningContext,
  payload: PlanningContext["followUpPayloads"][number],
): OperationInput {
  return {
    op: "CREATE",
    kind: payload.kind,
    statement: payload.statement,
    source_type: "human_reply",
    source_ref: context.sourceRef,
    confirmedBy: "owner",
    confidence: context.confidence,
    privacy_scope: payload.privacy_scope,
    tags: payload.tags,
    related_entities: payload.related_entities,
    notes: payload.notes,
    authority: OWNER_RATIFICATION_AUTHORITY,
    authorized: true,
  };
}

const OPERATION_HANDLERS: Record<ProposalOperationType, RatificationOperationHandler> = {
  create: {
    normalize: (context) => withEditedStatement(context, "create"),
    buildOperations: (context) => [
      buildCreateOperation(context),
      ...context.followUpPayloads.map((payload) => buildCreateOperationFromPayload(context, payload)),
    ],
  },
  confirm: {
    normalize: (context) => {
      if (
        context.response.answer_type === "edit"
        && context.seed.editedText.length > 0
        && context.seed.currentStatement !== null
        && context.seed.editedText !== context.seed.currentStatement
      ) {
        return withEditedStatement(context, "revise");
      }

      return buildDecision(context.response, context.seed, "confirm");
    },
    buildOperations: (context) => {
      if (!context.targetId) {
        throw new Error(`Proposal ${context.proposalId} cannot confirm without target_ref.object_id`);
      }

      return [{
        op: "CONFIRM",
        targetId: context.targetId,
        confirmedBy: "owner",
        authority: OWNER_RATIFICATION_AUTHORITY,
        authorized: true,
      }];
    },
  },
  revise: {
    normalize: (context) => withEditedStatement(context, "revise"),
    buildOperations: (context) => {
      if (!context.targetId || !context.statement) {
        throw new Error(`Proposal ${context.proposalId} cannot revise without target_ref.object_id and statement`);
      }

      return [{
        op: "REVISE",
        targetId: context.targetId,
        newStatement: context.statement,
        reason: context.reason,
        source_type: "human_reply",
        source_ref: context.sourceRef,
        confirmedBy: "owner",
        authority: OWNER_RATIFICATION_AUTHORITY,
        authorized: true,
      }, ...context.followUpPayloads.map((payload) => buildCreateOperationFromPayload(context, payload))];
    },
  },
  supersede: {
    normalize: (context) => withEditedStatement(context, "supersede"),
    buildOperations: (context) => {
      if (!context.statement || !context.privacyScope) {
        throw new Error(`Proposal ${context.proposalId} cannot supersede without statement and privacy_scope`);
      }

      if (!context.targetId) {
        return [
          buildCreateOperation(context),
          ...context.followUpPayloads.map((payload) => buildCreateOperationFromPayload(context, payload)),
        ];
      }

      return [{
        op: "SUPERSEDE",
        oldId: context.targetId,
        newStatement: context.statement,
        newKind: context.kind,
        source_type: "human_reply",
        source_ref: context.sourceRef,
        confirmedBy: "owner",
        confidence: context.confidence,
        privacy_scope: context.privacyScope,
        authority: OWNER_RATIFICATION_AUTHORITY,
        authorized: true,
      }, ...context.followUpPayloads.map((payload) => buildCreateOperationFromPayload(context, payload))];
    },
  },
  deprecate: {
    normalize: (context) => buildDecision(context.response, context.seed, "deprecate"),
    buildOperations: (context) => {
      if (!context.targetId) {
        throw new Error(`Proposal ${context.proposalId} cannot deprecate without target_ref.object_id`);
      }

      return [{
        op: "DEPRECATE",
        targetId: context.targetId,
        reason: context.reason,
        authority: OWNER_RATIFICATION_AUTHORITY,
        authorized: true,
      }];
    },
  },
  contradict: {
    normalize: (context) => buildDecision(context.response, context.seed, "contradict"),
    buildOperations: (context) => {
      const relatedObjectId = typeof context.payload.related_object_id === "string"
        ? context.payload.related_object_id
        : null;

      if (!context.targetId || !relatedObjectId) {
        throw new Error(`Proposal ${context.proposalId} cannot contradict without both object references`);
      }

      return [{
        op: "CONTRADICT",
        leftId: context.targetId,
        rightId: relatedObjectId,
        reason: context.reason,
      }];
    },
  },
};

function buildNonAppliedPlan(
  proposal: ParsedObject,
  decision: NormalizedDecision,
  targetObject: ParsedObject | null = null,
  policies: {
    promotion?: PromotionPolicy;
    audience?: AudiencePolicyConfig;
  } = {},
): CanonicalOperationPlan {
  const context = buildPlanningContext(proposal, decision, targetObject, policies);

  switch (decision.answer_type) {
    case "reject":
      return {
        question_ref: decision.question_ref,
        proposal_id: decision.proposal_id,
        proposal_status: "rejected",
        operations: [buildRatificationAuditLog(context, decision, "rejected")],
      };

    case "defer":
    case "uncertain":
      return {
        question_ref: decision.question_ref,
        proposal_id: decision.proposal_id,
        proposal_status: decision.answer_type === "defer" ? "deferred" : "pending",
        operations: [buildRatificationAuditLog(
          context,
          decision,
          decision.answer_type === "defer" ? "deferred" : "pending",
        )],
      };

    default:
      throw new Error(`Unsupported non-applied answer type: ${decision.answer_type}`);
  }
}

export function normalizeDecision(
  proposal: ParsedObject,
  response: CurationResponse,
  targetObject: ParsedObject | null,
): NormalizedDecision {
  const seed = buildDecisionSeed(proposal, response, targetObject);
  return OPERATION_HANDLERS[seed.operation].normalize({ response, seed });
}

export function buildOperationPlan(
  proposal: ParsedObject,
  decision: NormalizedDecision,
  targetObject: ParsedObject | null = null,
  policies: {
    promotion?: PromotionPolicy;
    audience?: AudiencePolicyConfig;
  } = {},
): CanonicalOperationPlan {
  if (decision.answer_type === "reject" || decision.answer_type === "defer" || decision.answer_type === "uncertain") {
    return buildNonAppliedPlan(proposal, decision, targetObject, policies);
  }

  const context = buildPlanningContext(proposal, decision, targetObject, policies);
  return {
    question_ref: decision.question_ref,
    proposal_id: decision.proposal_id,
    proposal_status: "applied",
    operations: [
      buildRatificationAuditLog(context, decision, "applied"),
      ...OPERATION_HANDLERS[decision.operation].buildOperations(context),
    ],
  };
}
