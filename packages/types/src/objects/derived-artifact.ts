import { z } from "zod";
import { DerivedArtifactType, PrivacyScope, ProjectionProfile, WritebackMode } from "../enums.js";
import { AnyObjectId, DerivedArtifactId } from "../ids.js";

// Derived Artifact - generated output, not canonical truth (DATA-MODEL.md §2.8)

export const DerivedArtifactSchema = z
  .object({
    id: DerivedArtifactId,
    artifact_type: DerivedArtifactType,
    created_at: z.string().datetime(),
    derived_from: z.array(AnyObjectId),
    intended_audience: PrivacyScope,
    generated_by: z.string().min(1),
    source: z.literal("canonical_projection"),
    path: z.string().min(1),
    projection_id: z.string().min(1),
    projection_profile: ProjectionProfile,
    writeback_mode: WritebackMode,
    parsable: z.boolean(),
    channel: z.string().min(1).optional(),
    checksum: z.string().min(1),
    machine_extractable_sections: z.array(z.string()).optional(),
  })
  .strict();

export type DerivedArtifact = z.infer<typeof DerivedArtifactSchema>;
