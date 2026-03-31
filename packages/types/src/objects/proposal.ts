import { z } from "zod";
import {
  ProposalStatus,
  ProposalType,
  ProposalOperation,
  PrivacyScope,
  MemoryObjectKind,
} from "../enums.js";
import { CanonicalObjectId, EntityId, EventId, ProposalId } from "../ids.js";
import { Confidence } from "../shared/confidence.js";
import { StableReferenceSchema } from "../shared/stable-reference.js";

const RiskLevel = z.enum(["low", "medium", "high", "critical"]);

export const ProposalTargetRefSchema = StableReferenceSchema;

export const ProposalCandidatePayloadSchema = z
  .object({
    kind: MemoryObjectKind,
    statement: z.string().min(1).optional(),
    privacy_scope: PrivacyScope.optional(),
    tags: z.array(z.string().min(1)).optional(),
    related_entities: z.array(EntityId).optional(),
    related_object_id: CanonicalObjectId.optional(),
    notes: z.string().min(1).optional(),
  })
  .strict();

export const ProposalRiskSchema = z
  .object({
    level: RiskLevel,
    requires_human_approval: z.boolean(),
  })
  .strict();

export const ProposalProvenanceSchema = z
  .object({
    supporting_events: z.array(EventId),
  })
  .strict();

// Proposal — structured executable intent (ARCHITECTURE-V2.md §5)
export const ProposalSchema = z
  .object({
    id: ProposalId,
    type: ProposalType,
    operation: ProposalOperation,
    target_ref: ProposalTargetRefSchema,
    candidate_payload: ProposalCandidatePayloadSchema,
    reason: z.string().min(1),
    provenance: ProposalProvenanceSchema,
    confidence: Confidence,
    status: ProposalStatus,
    privacy_scope: PrivacyScope,

    policy_tags: z.array(z.string().min(1)).optional(),
    risk: ProposalRiskSchema.optional(),
    created_at: z.string().datetime().optional(),
    created_by: z.string().optional(),
  })
  .strict()
  .superRefine((proposal, ctx) => {
    if (
      (proposal.operation === "confirm"
        || proposal.operation === "revise"
        || proposal.operation === "supersede"
        || proposal.operation === "deprecate"
        || proposal.operation === "contradict")
      && proposal.target_ref.object_id === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `operation "${proposal.operation}" requires target_ref.object_id`,
        path: ["target_ref", "object_id"],
      });
    }

    if (
      (proposal.operation === "create"
        || proposal.operation === "revise"
        || proposal.operation === "supersede")
      && proposal.candidate_payload.statement === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `operation "${proposal.operation}" requires candidate_payload.statement`,
        path: ["candidate_payload", "statement"],
      });
    }

    if (
      proposal.operation === "contradict"
      && proposal.candidate_payload.related_object_id === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "operation \"contradict\" requires candidate_payload.related_object_id",
        path: ["candidate_payload", "related_object_id"],
      });
    }
  });

export type ProposalTargetRef = z.infer<typeof ProposalTargetRefSchema>;
export type ProposalCandidatePayload = z.infer<typeof ProposalCandidatePayloadSchema>;
export type ProposalRisk = z.infer<typeof ProposalRiskSchema>;
export type ProposalProvenance = z.infer<typeof ProposalProvenanceSchema>;
export type Proposal = z.infer<typeof ProposalSchema>;
