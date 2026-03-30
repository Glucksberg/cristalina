import { z } from "zod";
import { CurationPacketId } from "../ids.js";
import { QuestionSchema } from "./question.js";

// Daily Curation Packet (CURATION-PROTOCOL.md §12)

export const CurationPacketSchema = z
  .object({
    packet_id: CurationPacketId,
    created_at: z.string().datetime(),
    owner: z.string().min(1),
    question_count: z.number().int().min(0),
    questions: z.array(QuestionSchema),
  })
  .strict();

export type CurationPacket = z.infer<typeof CurationPacketSchema>;

// Curation Response Packet (CURATION-PROTOCOL.md §13)

export const CurationResponsePacketSchema = z
  .object({
    packet_id: CurationPacketId,
    responses: z.array(
      z.object({
        question_ref: z.string().min(1),
        answer_type: z.enum(["accept", "reject", "edit", "defer", "uncertain"]),
        answer_text: z.string().min(1),
      }),
    ),
    answered_at: z.string().datetime(),
    answered_by: z.string().min(1),
  })
  .strict();

export type CurationResponsePacket = z.infer<typeof CurationResponsePacketSchema>;
