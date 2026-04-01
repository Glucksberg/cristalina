import type { ParsedObject } from "@cristalina/validate";
import { PrivacyScope, type PrivacyScope as PrivacyScopeType } from "@cristalina/types";
import { isProposalType, proposalTypeRequiresHumanApproval } from "./proposal-type-policy.js";
import {
  DEFAULT_AUDIENCE_POLICY,
  DEFAULT_PROMOTION_POLICY,
  newlyVisibleAudiencesWithPolicy,
  type AudiencePolicyConfig,
  type PromotionPolicy,
} from "../policy/runtime.js";

export { type PromotionPolicy } from "../policy/runtime.js";
export const DEFAULT_POLICY: PromotionPolicy = DEFAULT_PROMOTION_POLICY;

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

export function getProposalPolicyTags(proposal: ParsedObject): string[] {
  return Array.isArray(proposal.data.policy_tags)
    ? proposal.data.policy_tags.filter((tag): tag is string => typeof tag === "string")
    : [];
}

export function getSupportingEvents(proposal: ParsedObject): string[] {
  const provenance = getRecord(proposal.data.provenance);
  return Array.isArray(provenance?.supporting_events)
    ? provenance.supporting_events.filter((eventId): eventId is string => typeof eventId === "string")
    : [];
}

function proposalOperation(proposal: ParsedObject): string | null {
  return typeof proposal.data.operation === "string" ? proposal.data.operation : null;
}

function getTargetObjectId(proposal: ParsedObject): string | null {
  const targetRef = getRecord(proposal.data.target_ref);
  return typeof targetRef?.object_id === "string" ? targetRef.object_id : null;
}

function isPrivacyScope(value: unknown): value is PrivacyScopeType {
  return typeof value === "string" && PrivacyScope.options.includes(value as PrivacyScopeType);
}

function candidatePrivacyScope(proposal: ParsedObject): PrivacyScopeType | null {
  const payload = getRecord(proposal.data.candidate_payload);
  if (isPrivacyScope(payload?.privacy_scope)) return payload.privacy_scope;
  return isPrivacyScope(proposal.data.privacy_scope) ? proposal.data.privacy_scope : null;
}

function targetPrivacyScope(targetObject: ParsedObject | null | undefined): PrivacyScopeType | null {
  return isPrivacyScope(targetObject?.data.privacy_scope) ? targetObject.data.privacy_scope : null;
}

export function privacyAudienceExpansionForProposal(
  proposal: ParsedObject,
  targetObject?: ParsedObject | null,
  audiencePolicy: AudiencePolicyConfig = DEFAULT_AUDIENCE_POLICY,
): PrivacyScopeType[] {
  const candidateScope = candidatePrivacyScope(proposal);
  if (!candidateScope) return [];

  const targetScope = targetPrivacyScope(targetObject);
  if (targetScope) {
    return newlyVisibleAudiencesWithPolicy(audiencePolicy, targetScope, candidateScope);
  }

  if (candidateScope === "shareable" || candidateScope === "public_safe") {
    return newlyVisibleAudiencesWithPolicy(audiencePolicy, "owner_private", candidateScope);
  }

  return [];
}

export function approvalReasonsForProposal(
  proposal: ParsedObject,
  policy: PromotionPolicy = DEFAULT_POLICY,
  targetObject?: ParsedObject | null,
  audiencePolicy: AudiencePolicyConfig = DEFAULT_AUDIENCE_POLICY,
): string[] {
  const reasons: string[] = [];
  const data = proposal.data;
  const risk = getRecord(data.risk);
  if (risk?.requires_human_approval === true) {
    reasons.push("explicit_risk_flag");
  }

  const payload = getRecord(data.candidate_payload);
  const kind = typeof payload?.kind === "string" ? payload.kind : null;
  if (kind && policy.highRiskKinds.has(kind)) {
    reasons.push(`high_risk_kind:${kind}`);
  }

  const proposalType = isProposalType(data.type) ? data.type : null;
  if (proposalType && proposalTypeRequiresHumanApproval(proposalType)) {
    reasons.push(`high_risk_type:${proposalType}`);
  }

  for (const tag of getProposalPolicyTags(proposal)) {
    if (policy.sensitivePolicyTags.has(tag)) {
      reasons.push(`sensitive_policy_tag:${tag}`);
    }
  }

  const supportingEvents = getSupportingEvents(proposal);
  const operation = proposalOperation(proposal);
  const mutatingOperations = new Set(["revise", "supersede", "deprecate", "contradict"]);
  if (operation && mutatingOperations.has(operation) && supportingEvents.length < policy.minimumSupportingEvents) {
    reasons.push("thin_provenance");
  }

  const targetId = getTargetObjectId(proposal);
  for (const audience of privacyAudienceExpansionForProposal(proposal, targetObject, audiencePolicy)) {
    reasons.push(targetId
      ? `privacy_audience_expansion:${audience}`
      : `outward_visibility:${audience}`);
  }

  return [...new Set(reasons)];
}

/** Check if a proposal targets a high-risk or thinly supported domain */
export function requiresHumanApproval(
  proposal: ParsedObject,
  policy: PromotionPolicy = DEFAULT_POLICY,
  targetObject?: ParsedObject | null,
  audiencePolicy: AudiencePolicyConfig = DEFAULT_AUDIENCE_POLICY,
): boolean {
  return approvalReasonsForProposal(proposal, policy, targetObject, audiencePolicy).length > 0;
}

export function supportingEventCount(proposal: ParsedObject): number {
  return getSupportingEvents(proposal).length;
}
