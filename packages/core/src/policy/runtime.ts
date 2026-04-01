import type {
  MemoryObjectKind,
  PrivacyScope,
  ProjectionProfile,
} from "@cristalina/types";

export interface AudiencePolicyConfig {
  defaultScope: PrivacyScope;
  escalationRule: string;
  audiences: Record<PrivacyScope, readonly PrivacyScope[]>;
  sensitiveCategories: readonly string[];
}

export interface PromotionPolicy {
  highRiskKinds: Set<string>;
  defaultQuestionCount: number;
  maxQuestionCount: number;
  sensitivePolicyTags: Set<string>;
  minimumSupportingEvents: number;
}

export interface AuthorityPolicy {
  highRiskKinds: Set<string>;
  restrictedKinds: Set<string>;
  trustedOwnerChannelPrefixes: string[];
}

export interface ProjectionTierLimit {
  hot: number;
  warm: number;
  cold: number;
}

export interface ProjectionPolicy {
  defaultProfiles: Record<PrivacyScope, ProjectionProfile>;
  channelProfileRules: Array<{
    matchPrefix: string;
    profile: ProjectionProfile;
  }>;
  tierLimits: Record<ProjectionProfile, ProjectionTierLimit>;
  kindWeights: Map<MemoryObjectKind, number>;
  alwaysHotKinds: Set<MemoryObjectKind>;
}

export const DEFAULT_AUDIENCE_POLICY: AudiencePolicyConfig = {
  defaultScope: "owner_private",
  escalationRule: "no_automatic_privacy_escalation",
  audiences: {
    owner_private: ["owner_private", "agent_operational", "project_private", "shareable", "public_safe"],
    agent_operational: ["agent_operational", "shareable", "public_safe"],
    project_private: ["project_private", "shareable", "public_safe"],
    shareable: ["shareable", "public_safe"],
    public_safe: ["public_safe"],
  },
  sensitiveCategories: ["credentials", "finances", "precise_location", "health", "private_strategy"],
};

export const DEFAULT_PROMOTION_POLICY: PromotionPolicy = {
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

export const DEFAULT_AUTHORITY_POLICY: AuthorityPolicy = {
  highRiskKinds: new Set([
    "value",
    "priority",
    "identity_trait",
    "style_rule",
  ]),
  restrictedKinds: new Set([
    "value",
    "priority",
    "identity_trait",
    "style_rule",
  ]),
  trustedOwnerChannelPrefixes: [
    "owner_private",
    "project_private",
  ],
};

export const DEFAULT_PROJECTION_POLICY: ProjectionPolicy = {
  defaultProfiles: {
    owner_private: "deep",
    agent_operational: "standard",
    project_private: "standard",
    shareable: "standard",
    public_safe: "tiny",
  },
  channelProfileRules: [
    { matchPrefix: "group_", profile: "tiny" },
    { matchPrefix: "public_", profile: "tiny" },
    { matchPrefix: "project_", profile: "standard" },
    { matchPrefix: "agent_", profile: "standard" },
    { matchPrefix: "shareable_", profile: "standard" },
    { matchPrefix: "owner_", profile: "deep" },
  ],
  tierLimits: {
    tiny: { hot: 8, warm: 6, cold: 8 },
    standard: { hot: 14, warm: 18, cold: 24 },
    deep: { hot: 24, warm: 40, cold: 60 },
  },
  kindWeights: new Map<MemoryObjectKind, number>([
    ["identity_trait", 15],
    ["value", 15],
    ["priority", 15],
    ["style_rule", 10],
    ["preference", 10],
    ["constraint", 8],
  ]),
  alwaysHotKinds: new Set<MemoryObjectKind>([
    "identity_trait",
    "value",
    "priority",
    "style_rule",
  ]),
};

export function visibleScopesForAudienceWithPolicy(
  policy: AudiencePolicyConfig,
  audience: PrivacyScope,
): readonly PrivacyScope[] {
  return policy.audiences[audience];
}

export function canAudienceAccessScopeWithPolicy(
  policy: AudiencePolicyConfig,
  audience: PrivacyScope,
  scope: PrivacyScope,
): boolean {
  return policy.audiences[audience].includes(scope);
}

export function visibleAudiencesForScopeWithPolicy(
  policy: AudiencePolicyConfig,
  scope: PrivacyScope,
): PrivacyScope[] {
  return (Object.keys(policy.audiences) as PrivacyScope[])
    .filter((audience) => canAudienceAccessScopeWithPolicy(policy, audience, scope));
}

export function newlyVisibleAudiencesWithPolicy(
  policy: AudiencePolicyConfig,
  from: PrivacyScope,
  to: PrivacyScope,
): PrivacyScope[] {
  const fromAudiences = new Set(visibleAudiencesForScopeWithPolicy(policy, from));
  return visibleAudiencesForScopeWithPolicy(policy, to)
    .filter((audience) => !fromAudiences.has(audience));
}

export function isScopeEscalationWithPolicy(
  policy: AudiencePolicyConfig,
  from: PrivacyScope,
  to: PrivacyScope,
): boolean {
  return newlyVisibleAudiencesWithPolicy(policy, from, to).length > 0;
}
