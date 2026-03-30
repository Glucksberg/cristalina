import { z } from "zod";
import { QuestionClass } from "../enums.js";
import { QuestionId } from "../ids.js";

// Question — compact curation question for the owner (DATA-MODEL.md §8)

export const QuestionSchema = z
  .object({
    // Required fields
    id: QuestionId,
    type: QuestionClass,
    question: z.string().min(1),
    proposal_refs: z.array(z.string()),

    // Recommended fields
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  })
  .strict();

export type Question = z.infer<typeof QuestionSchema>;
