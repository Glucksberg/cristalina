import { z } from "zod";
import { ContradictionStatus } from "../enums.js";
import { ContradictionId } from "../ids.js";

// Contradiction — explicit conflict between two memories (DATA-MODEL.md §7)

export const ContradictionSchema = z
  .object({
    // Required fields
    id: ContradictionId,
    left: z.string().min(1),
    right: z.string().min(1),
    reason: z.string().min(1),
    status: ContradictionStatus,

    // Recommended fields
    opened_at: z.string().datetime().optional(),
    resolved_at: z.string().datetime().optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    requires_human_review: z.boolean().optional(),
    resolution_notes: z.string().optional(),
  })
  .strict();

export type Contradiction = z.infer<typeof ContradictionSchema>;
