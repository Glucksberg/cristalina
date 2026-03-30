import { z } from "zod";
import { DerivedArtifactId } from "../ids.js";

// Derived Artifact — generated output, not canonical truth (DATA-MODEL.md §2.8)

export const DerivedArtifactSchema = z
  .object({
    // Required fields
    id: DerivedArtifactId,
    artifact_type: z.string().min(1),
    created_at: z.string().datetime(),
    derived_from: z.array(z.string()),
    intended_audience: z.string().min(1),
  })
  .strict();

export type DerivedArtifact = z.infer<typeof DerivedArtifactSchema>;
