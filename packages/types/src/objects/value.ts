import { z } from "zod";
import { MemoryStatus, SourceType, PrivacyScope, MemoryObjectKind } from "../enums.js";
import { EntityId } from "../ids.js";
import { ValueId } from "../ids.js";
import { Confidence } from "../shared/confidence.js";

// Value Object — priorities and behavioral guardrails (DATA-MODEL.md §2.5)

export const ValueSchema = z
  .object({
    // Required fields
    id: ValueId,
    kind: MemoryObjectKind,
    statement: z.string().min(1),
    status: MemoryStatus,
    confidence: Confidence,
    source_type: SourceType,
    source_ref: z.string().min(1),
    privacy_scope: PrivacyScope,

    // Recommended fields
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    applies_to: z.array(EntityId).optional(),
    exceptions: z.array(z.string()).optional(),
    examples: z.array(z.string()).optional(),
    created_at: z.string().datetime().optional(),
    last_confirmed_at: z.string().datetime().nullable().optional(),
    confirmed_by: z.string().nullable().optional(),
    evidence_count: z.number().int().min(0).nullable().optional(),
    tags: z.array(z.string()).optional(),
  })
  .strict();

export type Value = z.infer<typeof ValueSchema>;
