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
  target: string,
  proposalType: string,
  policy: PromotionPolicy = DEFAULT_POLICY,
): boolean {
  // Check if target path is in a restricted area
  const restrictedPaths = ["core/values/", "core/identity/", "core/privacy/", "core/preferences/"];
  if (restrictedPaths.some((p) => target.startsWith(p))) return true;

  // Check if proposal type touches high-risk domains
  const highRiskTypes = ["new_value", "revise_value", "identity_adjustment", "privacy_change"];
  if (highRiskTypes.includes(proposalType)) return true;

  return false;
}
