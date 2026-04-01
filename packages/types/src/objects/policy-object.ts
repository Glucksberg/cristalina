import { z } from "zod";
import {
  MemoryObjectKind,
  PolicyStatus,
  PrivacyScope,
  ProjectionProfile,
} from "../enums.js";
import { PolicyId } from "../ids.js";

const PolicyMetadataSchema = z
  .object({
    version: z.number().int().min(1).optional(),
    updated_at: z.string().datetime().optional(),
    notes: z.string().min(1).optional(),
  })
  .strict();

const AudienceVisibilitySchema = z
  .object({
    can_view: z.array(PrivacyScope).min(1),
  })
  .strict();

const AudienceMatrixSchema = z
  .object({
    owner_private: AudienceVisibilitySchema,
    agent_operational: AudienceVisibilitySchema,
    project_private: AudienceVisibilitySchema,
    shareable: AudienceVisibilitySchema,
    public_safe: AudienceVisibilitySchema,
  })
  .strict();

export const AudiencePolicySchema = z
  .object({
    id: PolicyId,
    kind: z.literal("audience_policy"),
    status: PolicyStatus,
    default_scope: PrivacyScope,
    policy_mode: z.literal("audience_aware"),
    escalation_rule: z.string().min(1),
    audiences: AudienceMatrixSchema,
    sensitive_categories: z.array(z.string().min(1)).optional(),
    metadata: PolicyMetadataSchema.optional(),
  })
  .strict();

export const PromotionPolicySchema = z
  .object({
    id: PolicyId,
    kind: z.literal("promotion_policy"),
    status: PolicyStatus,
    default_question_count: z.number().int().min(1),
    max_question_count: z.number().int().min(1),
    high_risk_kinds: z.array(MemoryObjectKind).optional(),
    sensitive_policy_tags: z.array(z.string().min(1)).optional(),
    minimum_supporting_events: z.number().int().min(0),
    metadata: PolicyMetadataSchema.optional(),
  })
  .strict();

export const AuthorityPolicySchema = z
  .object({
    id: PolicyId,
    kind: z.literal("authority_policy"),
    status: PolicyStatus,
    high_risk_kinds: z.array(MemoryObjectKind).optional(),
    restricted_kinds: z.array(MemoryObjectKind).optional(),
    trusted_owner_channel_prefixes: z.array(z.string().min(1)).optional(),
    metadata: PolicyMetadataSchema.optional(),
  })
  .strict();

const TierLimitSchema = z
  .object({
    hot: z.number().int().min(1),
    warm: z.number().int().min(1),
    cold: z.number().int().min(1),
  })
  .strict();

const KindWeightSchema = z
  .object({
    kind: MemoryObjectKind,
    weight: z.number().int().min(0),
  })
  .strict();

const ChannelProfileRuleSchema = z
  .object({
    match_prefix: z.string().min(1),
    profile: ProjectionProfile,
  })
  .strict();

const ProjectionDefaultProfilesSchema = z
  .object({
    owner_private: ProjectionProfile,
    agent_operational: ProjectionProfile,
    project_private: ProjectionProfile,
    shareable: ProjectionProfile,
    public_safe: ProjectionProfile,
  })
  .strict();

export const ProjectionPolicySchema = z
  .object({
    id: PolicyId,
    kind: z.literal("projection_policy"),
    status: PolicyStatus,
    default_profiles: ProjectionDefaultProfilesSchema,
    channel_profile_rules: z.array(ChannelProfileRuleSchema).optional(),
    tier_limits: z.object({
      tiny: TierLimitSchema,
      standard: TierLimitSchema,
      deep: TierLimitSchema,
    }).strict(),
    kind_weights: z.array(KindWeightSchema).optional(),
    always_hot_kinds: z.array(MemoryObjectKind).optional(),
    metadata: PolicyMetadataSchema.optional(),
  })
  .strict();

export const PolicyObjectSchema = z.discriminatedUnion("kind", [
  AudiencePolicySchema,
  PromotionPolicySchema,
  AuthorityPolicySchema,
  ProjectionPolicySchema,
]);

export type AudiencePolicy = z.infer<typeof AudiencePolicySchema>;
export type PromotionPolicyObject = z.infer<typeof PromotionPolicySchema>;
export type AuthorityPolicyObject = z.infer<typeof AuthorityPolicySchema>;
export type ProjectionPolicyObject = z.infer<typeof ProjectionPolicySchema>;
export type PolicyObject = z.infer<typeof PolicyObjectSchema>;
