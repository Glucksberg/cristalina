import type { ParsedObject } from "@cristalina/validate";
import { isProposalType, proposalTypeRequiresHumanApproval } from "./proposal-type-policy.js";

/** Which domains require human approval before canonical update */
export interface PromotionPolicy {
  /** Memory object kinds that MUST require human approval */
  highRiskKinds: Set<string>;
  /** Default number of questions per curation packet */
  defaultQuestionCount: number;
  /** Maximum questions per packet */
  maxQuestionCount: number;
  /** Policy tags that always imply a sensitive domain */
  sensitivePolicyTags: Set<string>;
  /** Minimum evidentiary support expected for mutation proposals */
  minimumSupportingEvents: number;
}

export const DEFAULT_POLICY: PromotionPolicy = {
  highRiskKinds: new Set([
    "value",
    "priority",
    "identity_trait",
    "style_rule",
  ]),
  defaultQuestionCount: 3,
  maxQuestionCount: 5,
  sensitivePolicyTags: new Set([
    "privacy",
    "sharing",
    "identity",
    "public_behavior",
    "security",
    "sensitive_preference",
    "external_sharing",
  ]),
  minimumSupportingEvents: 1,
};

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

export function approvalReasonsForProposal(
  proposal: ParsedObject,
  policy: PromotionPolicy = DEFAULT_POLICY,
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

  return [...new Set(reasons)];
}

/** Check if a proposal targets a high-risk or thinly supported domain */
export function requiresHumanApproval(
  proposal: ParsedObject,
  policy: PromotionPolicy = DEFAULT_POLICY,
): boolean {
  return approvalReasonsForProposal(proposal, policy).length > 0;
}

export function supportingEventCount(proposal: ParsedObject): number {
  return getSupportingEvents(proposal).length;
}
