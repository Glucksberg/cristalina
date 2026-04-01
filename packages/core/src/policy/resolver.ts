import type {
  AuthorityPolicyObject,
  AudiencePolicy,
  MemoryObjectKind,
  PolicyObject,
  PrivacyScope,
  ProjectionPolicyObject,
  ProjectionProfile,
  PromotionPolicyObject,
} from "@cristalina/types";
import type { ParsedObject, ParsedStore } from "@cristalina/validate";
import {
  DEFAULT_AUDIENCE_POLICY,
  DEFAULT_AUTHORITY_POLICY,
  DEFAULT_PROJECTION_POLICY,
  DEFAULT_PROMOTION_POLICY,
  type AudiencePolicyConfig,
  type AuthorityPolicy,
  type ProjectionPolicy,
  type PromotionPolicy,
} from "./runtime.js";

function policyByKind<T extends PolicyObject["kind"]>(
  store: ParsedStore,
  kind: T,
): Extract<PolicyObject, { kind: T }> | null {
  const obj = store.policyObjects.find((entry) => entry.data.kind === kind);
  return obj ? obj.data as Extract<PolicyObject, { kind: T }> : null;
}

function privacyScopes(): PrivacyScope[] {
  return ["owner_private", "agent_operational", "project_private", "shareable", "public_safe"];
}

function projectionProfiles(): ProjectionProfile[] {
  return ["tiny", "standard", "deep"];
}

export function resolveAudiencePolicy(store: ParsedStore): AudiencePolicyConfig {
  const policy = policyByKind(store, "audience_policy") as AudiencePolicy | null;
  if (!policy) return DEFAULT_AUDIENCE_POLICY;

  return {
    defaultScope: policy.default_scope,
    escalationRule: policy.escalation_rule,
    audiences: {
      owner_private: policy.audiences.owner_private.can_view,
      agent_operational: policy.audiences.agent_operational.can_view,
      project_private: policy.audiences.project_private.can_view,
      shareable: policy.audiences.shareable.can_view,
      public_safe: policy.audiences.public_safe.can_view,
    },
    sensitiveCategories: policy.sensitive_categories ?? DEFAULT_AUDIENCE_POLICY.sensitiveCategories,
  };
}

export function resolvePromotionPolicy(store: ParsedStore): PromotionPolicy {
  const policy = policyByKind(store, "promotion_policy") as PromotionPolicyObject | null;
  if (!policy) return DEFAULT_PROMOTION_POLICY;

  return {
    highRiskKinds: new Set(policy.high_risk_kinds ?? [...DEFAULT_PROMOTION_POLICY.highRiskKinds]),
    defaultQuestionCount: policy.default_question_count,
    maxQuestionCount: policy.max_question_count,
    sensitivePolicyTags: new Set(policy.sensitive_policy_tags ?? [...DEFAULT_PROMOTION_POLICY.sensitivePolicyTags]),
    minimumSupportingEvents: policy.minimum_supporting_events,
  };
}

export function resolveAuthorityPolicy(store: ParsedStore): AuthorityPolicy {
  const policy = policyByKind(store, "authority_policy") as AuthorityPolicyObject | null;
  if (!policy) return DEFAULT_AUTHORITY_POLICY;

  return {
    highRiskKinds: new Set(policy.high_risk_kinds ?? [...DEFAULT_AUTHORITY_POLICY.highRiskKinds]),
    restrictedKinds: new Set(policy.restricted_kinds ?? [...DEFAULT_AUTHORITY_POLICY.restrictedKinds]),
    trustedOwnerChannelPrefixes: policy.trusted_owner_channel_prefixes ?? DEFAULT_AUTHORITY_POLICY.trustedOwnerChannelPrefixes,
  };
}

export function resolveProjectionPolicy(store: ParsedStore): ProjectionPolicy {
  const policy = policyByKind(store, "projection_policy") as ProjectionPolicyObject | null;
  if (!policy) return DEFAULT_PROJECTION_POLICY;

  const channelProfileRules = policy.channel_profile_rules
    ? policy.channel_profile_rules.map((rule) => ({
        matchPrefix: rule.match_prefix,
        profile: rule.profile,
      }))
    : DEFAULT_PROJECTION_POLICY.channelProfileRules;

  return {
    defaultProfiles: policy.default_profiles,
    channelProfileRules,
    tierLimits: Object.fromEntries(
      projectionProfiles().map((profile) => [profile, policy.tier_limits[profile]]),
    ) as ProjectionPolicy["tierLimits"],
    kindWeights: new Map<MemoryObjectKind, number>(
      (policy.kind_weights ?? [...DEFAULT_PROJECTION_POLICY.kindWeights.entries()].map(([kind, weight]) => ({ kind, weight })))
        .map((entry) => [entry.kind, entry.weight]),
    ),
    alwaysHotKinds: new Set(policy.always_hot_kinds ?? [...DEFAULT_PROJECTION_POLICY.alwaysHotKinds]),
  };
}

export function resolvePolicyBundle(store: ParsedStore): {
  audience: AudiencePolicyConfig;
  promotion: PromotionPolicy;
  authority: AuthorityPolicy;
  projection: ProjectionPolicy;
} {
  return {
    audience: resolveAudiencePolicy(store),
    promotion: resolvePromotionPolicy(store),
    authority: resolveAuthorityPolicy(store),
    projection: resolveProjectionPolicy(store),
  };
}

export function findEntityById(store: ParsedStore, entityId: string): ParsedObject | null {
  return store.entities.find((entity) => entity.data.id === entityId) ?? null;
}
