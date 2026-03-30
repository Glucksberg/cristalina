import { z } from "zod";
import { SourceType } from "../enums.js";

// Provenance fields required on every canonical memory object (SPEC.md §15)
export const ProvenanceFields = z.object({
  source_type: SourceType,
  source_ref: z.string().min(1),
  created_at: z.string().datetime(),
  last_confirmed_at: z.string().datetime().nullable(),
  confirmed_by: z.string().nullable(),
  evidence_count: z.number().int().min(0).nullable(),
});
export type ProvenanceFields = z.infer<typeof ProvenanceFields>;
