import type { ParsedObject } from "@cristalina/validate";

/** Which domains require human approval before canonical update */
export interface PromotionPolicy {
  /** Memory object kinds that MUST require human approval */
  highRiskKinds: Set<string>;
  /** Default number of questions per curation packet */
  defaultQuestionCount: number;
  /** Maximum questions per packet */
  maxQuestionCount: number;
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
};

/** Check if a proposal targets a high-risk domain */
export function requiresHumanApproval(
  proposal: ParsedObject,
  policy: PromotionPolicy = DEFAULT_POLICY,
): boolean {
  const data = proposal.data;
  const risk = typeof data.risk === "object" && data.risk !== null
    ? data.risk as Record<string, unknown>
    : null;
  if (typeof risk?.requires_human_approval === "boolean") {
    return risk.requires_human_approval;
  }

  const payload = typeof data.candidate_payload === "object" && data.candidate_payload !== null
    ? data.candidate_payload as Record<string, unknown>
    : null;
  const kind = typeof payload?.kind === "string" ? payload.kind : null;
  if (kind && policy.highRiskKinds.has(kind)) return true;

  // Check if proposal type touches high-risk domains
  const proposalType = typeof data.type === "string" ? data.type : "";
  const highRiskTypes = ["new_value", "revise_value", "identity_adjustment", "privacy_change"];
  if (highRiskTypes.includes(proposalType)) return true;

  return false;
}
