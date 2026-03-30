import { z } from "zod";
import { MemoryStatus, MemoryObjectKind, PrivacyScope, SourceType } from "../enums.js";
import { Confidence } from "../shared/confidence.js";

// Canonical Memory Object — stable, governed memory (DATA-MODEL.md §2.3)

export const MemoryObjectSchema = z
  .object({
    // Required fields
    id: z.string().min(1),
    kind: MemoryObjectKind,
    statement: z.string().min(1),
    status: MemoryStatus,
    confidence: Confidence,
    source_type: SourceType,
    source_ref: z.string().min(1),
    created_at: z.string().datetime(),
    last_confirmed_at: z.string().datetime().nullable(),
    confirmed_by: z.string().nullable(),
    evidence_count: z.number().int().min(0).nullable(),
    privacy_scope: PrivacyScope,

    // Recommended fields
    supersedes: z.array(z.string()).optional(),
    superseded_by: z.array(z.string()).optional(),
    valid_from: z.string().optional(),
    valid_to: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
    related_entities: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })
  .strict();

export type MemoryObject = z.infer<typeof MemoryObjectSchema>;
