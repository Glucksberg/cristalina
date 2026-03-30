import { z } from "zod";
import { ProposalStatus, ProposalType, PrivacyScope } from "../enums.js";
import { ProposalId } from "../ids.js";
import { Confidence } from "../shared/confidence.js";

// Proposal — structured candidate change (DATA-MODEL.md §2.2)

export const ProposalSchema = z
  .object({
    // Required fields
    id: ProposalId,
    type: ProposalType,
    target: z.string().min(1),
    reason: z.string().min(1),
    supporting_events: z.array(z.string()),
    confidence: Confidence,
    status: ProposalStatus,
    privacy_scope: PrivacyScope,

    // Recommended fields
    created_at: z.string().datetime().optional(),
    created_by: z.string().optional(),
    impact_level: z.enum(["low", "medium", "high", "critical"]).optional(),
    requires_human_approval: z.boolean().optional(),
    question_candidate: z.string().optional(),
  })
  .strict();

export type Proposal = z.infer<typeof ProposalSchema>;
