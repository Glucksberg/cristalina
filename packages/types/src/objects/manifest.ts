import { z } from "zod";

// Manifest — protocol and repository metadata (manifest.yaml)

const MaintainerSchema = z
  .object({
    name: z.string().min(1),
    role: z.string().min(1),
  })
  .strict();

const ModuleSchema = z
  .object({
    name: z.string().min(1),
    status: z.string().min(1),
  })
  .strict();

export const ManifestSchema = z
  .object({
    // Required fields
    name: z.string().min(1),
    display_name: z.string().min(1),
    type: z.literal("memory_protocol"),
    protocol_version: z.string().min(1),
    documents: z.object({
      spec: z.string().min(1),
      data_model: z.string().min(1),
      architecture_v2: z.string().min(1),
      curation_protocol: z.string().min(1),
      openclaw_adapter: z.string().min(1),
    }),
    schemas: z.object({
      manifest: z.string().min(1),
      event: z.string().min(1),
      proposal: z.string().min(1),
      memory_object: z.string().min(1),
      entity: z.string().min(1),
      policy_object: z.string().min(1),
      derived_artifact: z.string().min(1),
      projection_manifest: z.string().min(1),
      adapter_writeback_contract: z.string().min(1),
    }),

    // Recommended fields
    status: z.string().optional(),
    repository_version: z.string().optional(),
    canonical_language: z.string().optional(),
    license: z.string().optional(),
    maintainers: z.array(MaintainerSchema).optional(),
    modules: z.array(ModuleSchema).optional(),
    examples: z.record(z.string()).optional(),
    release_notes: z.record(z.string()).optional(),
  })
  .strict();

export type Manifest = z.infer<typeof ManifestSchema>;
