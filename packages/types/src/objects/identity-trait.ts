import { z } from "zod";
import { MemoryStatus, SourceType, PrivacyScope, MemoryObjectKind } from "../enums.js";
import { IdentityTraitId } from "../ids.js";
import { Confidence } from "../shared/confidence.js";

// Identity Trait Object — durable aspects of agent role/self-presentation (DATA-MODEL.md §2.6)

export const IdentityTraitSchema = z
  .object({
    // Required fields
    id: IdentityTraitId,
    kind: MemoryObjectKind,
    statement: z.string().min(1),
    status: MemoryStatus,
    confidence: Confidence,
    source_type: SourceType,
    source_ref: z.string().min(1),
    privacy_scope: PrivacyScope,

    // Recommended fields
    created_at: z.string().datetime().optional(),
    last_confirmed_at: z.string().datetime().nullable().optional(),
    confirmed_by: z.string().nullable().optional(),
    evidence_count: z.number().int().min(0).nullable().optional(),
    tags: z.array(z.string()).optional(),
  })
  .strict();

export type IdentityTrait = z.infer<typeof IdentityTraitSchema>;
