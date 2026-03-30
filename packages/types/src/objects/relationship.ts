import { z } from "zod";
import { MemoryStatus, RelationType, SourceType, PrivacyScope } from "../enums.js";
import { RelationshipId } from "../ids.js";
import { Confidence } from "../shared/confidence.js";

// Relationship Object — structured links between entities (DATA-MODEL.md §2.4)

export const RelationshipSchema = z
  .object({
    // Required fields
    id: RelationshipId,
    from: z.string().min(1),
    relation: RelationType,
    to: z.string().min(1),
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
  .strict();

export type Relationship = z.infer<typeof RelationshipSchema>;
