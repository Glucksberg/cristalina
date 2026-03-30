import { z } from "zod";
import { AnswerType } from "../enums.js";
import { QuestionResponseId } from "../ids.js";

// Response — owner's answer to a curation question (DATA-MODEL.md §8)

export const ResponseSchema = z
  .object({
    // Required fields
    id: QuestionResponseId,
    question_ref: z.string().min(1),
    answer_type: AnswerType,
    answer_text: z.string().min(1),
    answered_at: z.string().datetime(),
    answered_by: z.string().min(1),
  })
  .strict();

export type Response = z.infer<typeof ResponseSchema>;
