import { z } from "zod";
import { PrivacyScope, ProjectionProfile, WritebackMode } from "../enums.js";
import { AdapterWritebackContractSchema } from "./adapter-writeback-contract.js";
import { DerivedArtifactSchema } from "./derived-artifact.js";

export const ProjectionManifestSchema = z.object({
  projection_id: z.string().min(1),
  adapter: z.string().min(1),
  generated_at: z.string().datetime(),
  audience: PrivacyScope,
  channel: z.string().min(1).optional(),
  projection_profile: ProjectionProfile,
  writeback_mode: WritebackMode,
  artifacts: z.array(DerivedArtifactSchema),
  contract: AdapterWritebackContractSchema,
}).strict();

export type ProjectionManifest = z.infer<typeof ProjectionManifestSchema>;
