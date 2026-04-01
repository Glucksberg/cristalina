import { describe, it, expect } from "vitest";
import { validateManifest } from "../../src/store/manifest-validator.js";
import type { ParsedStore } from "../../src/store/reader.js";

function makeStore(overrides: Partial<ParsedStore> = {}): ParsedStore {
  return {
    root: "/test", manifest: null, manifestFile: null,
    events: [], proposals: [], curationPackets: [], coreObjects: [], entities: [], policyObjects: [], contradictions: [],
    files: [], parseErrors: [], ...overrides,
  };
}

describe("validateManifest", () => {
  it("reports missing manifest", () => {
    const diags = validateManifest(makeStore());
    expect(diags.some((d) => d.rule === "manifest/missing")).toBe(true);
  });

  it("reports schema errors on invalid manifest", () => {
    const store = makeStore({
      manifest: { name: "test" }, // missing required fields
      manifestFile: "manifest.yaml",
    });
    const diags = validateManifest(store);
    expect(diags.some((d) => d.rule === "manifest/schema")).toBe(true);
  });

  it("passes with valid manifest", () => {
    const store = makeStore({
      manifest: {
        name: "cristalina", display_name: "Cristalina", type: "memory_protocol",
        protocol_version: "1.0-draft",
        documents: {
          spec: "docs/SPEC.md",
          data_model: "docs/DATA-MODEL.md",
          architecture_v2: "docs/ARCHITECTURE-V2.md",
          curation_protocol: "docs/CURATION-PROTOCOL.md",
          openclaw_adapter: "docs/adapters/OPENCLAW-ADAPTER.md",
          constitutional_core: "docs/CONSTITUTIONAL-CORE.md",
        },
        schemas: {
          manifest: "schemas/manifest.schema.json",
          event: "schemas/event.schema.json",
          proposal: "schemas/proposal.schema.json",
          memory_object: "schemas/memory-object.schema.json",
          entity: "schemas/entity.schema.json",
          policy_object: "schemas/policy-object.schema.json",
          derived_artifact: "schemas/derived-artifact.schema.json",
          projection_manifest: "schemas/projection-manifest.schema.json",
          adapter_writeback_contract: "schemas/adapter-writeback-contract.schema.json",
        },
      },
      manifestFile: "manifest.yaml",
    });
    const diags = validateManifest(store);
    // May have warnings for missing files (since /test doesn't exist), but no schema errors
    const schemaErrors = diags.filter((d) => d.rule === "manifest/schema");
    expect(schemaErrors).toHaveLength(0);
  });
});
