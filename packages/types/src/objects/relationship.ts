import { z } from "zod";
import { MemoryStatus, RelationType, SourceType, PrivacyScope } from "../enums.js";
import { RelationshipId } from "../ids.js";
import { Confidence } from "../shared/confidence.js";
import { StableReferenceSchema } from "../shared/stable-reference.js";

// Relationship Object — structured links between entities (DATA-MODEL.md §2.4)

export const RelationshipSchema = z
  .object({
    // Required fields
    id: RelationshipId,
    kind: z.literal("relationship"),
    from: z.string().min(1).optional(),
    from_ref: StableReferenceSchema.optional(),
    relation: RelationType,
    to: z.string().min(1).optional(),
    to_ref: StableReferenceSchema.optional(),
    status: MemoryStatus,
    confidence: Confidence,
    source_type: SourceType,
    source_ref: z.string().min(1),
    privacy_scope: PrivacyScope,

    // Recommended fields
    valid_from: z.string().optional(),
    valid_to: z.string().nullable().optional(),
    created_at: z.string().datetime().optional(),
    last_confirmed_at: z.string().datetime().nullable().optional(),
    confirmed_by: z.string().nullable().optional(),
    evidence_count: z.number().int().min(0).nullable().optional(),
    tags: z.array(z.string()).optional(),
  })
  .strict()
  .superRefine((relationship, ctx) => {
    if (relationship.from_ref === undefined && relationship.from === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "relationship requires from_ref or legacy from",
        path: ["from_ref"],
      });
    }

    if (relationship.to_ref === undefined && relationship.to === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "relationship requires to_ref or legacy to",
        path: ["to_ref"],
      });
    }
  });

export type Relationship = z.infer<typeof RelationshipSchema>;
