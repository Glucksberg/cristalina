import { z } from "zod";
import { MemoryStatus, SourceType, PrivacyScope, MemoryObjectKind } from "../enums.js";
import { StyleRuleId } from "../ids.js";
import { Confidence } from "../shared/confidence.js";

// Style Rule Object — tone and presentation rules (DATA-MODEL.md §2.7)

export const StyleRuleSchema = z
  .object({
    // Required fields
    id: StyleRuleId,
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

export type StyleRule = z.infer<typeof StyleRuleSchema>;
