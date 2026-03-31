import { z } from "zod";
import { Confidence } from "../shared/confidence.js";
import { DerivedArtifactType, ProposalOperation, WritebackMode } from "../enums.js";

export const AdapterWritebackFileRuleSchema = z.object({
  path: z.string().min(1),
  artifact_type: DerivedArtifactType,
  parsable: z.boolean(),
  machine_extractable_sections: z.array(z.string()),
  default_confidence: Confidence,
  requires_human_review: z.boolean(),
  allowed_operations: z.array(ProposalOperation),
  provenance_source: z.string().min(1),
}).strict();

export type AdapterWritebackFileRule = z.infer<typeof AdapterWritebackFileRuleSchema>;

export const AdapterWritebackContractSchema = z.object({
  adapter: z.string().min(1),
  writeback_mode: WritebackMode,
  default_source_type: z.literal("runtime_observation"),
  files: z.array(AdapterWritebackFileRuleSchema).min(1),
}).strict();

export type AdapterWritebackContract = z.infer<typeof AdapterWritebackContractSchema>;
