import { describe, it, expect } from "vitest";
import { entityGovernance } from "../../src/rules/entity-governance.js";
import type { ParsedStore } from "../../src/store/reader.js";

function makeStore(overrides: Partial<ParsedStore> = {}): ParsedStore {
  return {
    root: "/test",
    manifest: null,
    manifestFile: null,
    events: [],
    proposals: [],
    curationPackets: [],
    coreObjects: [],
    entities: [],
    policyObjects: [],
    contradictions: [],
    files: [],
    parseErrors: [],
    ...overrides,
  };
}

describe("entityGovernance rule", () => {
  it("passes with one active owner and one active agent", () => {
    const store = makeStore({
      entities: [
        {
          data: {
            id: "ent-owner",
            kind: "owner",
            name: "Owner",
            status: "active",
            privacy_scope: "owner_private",
            aliases: ["markus"],
          },
          file: "entities/registry.yaml",
        },
        {
          data: {
            id: "ent-agent",
            kind: "agent",
            name: "Cristalina",
            status: "active",
            privacy_scope: "owner_private",
            aliases: ["assistant"],
            channels: ["owner_private_runtime"],
          },
          file: "entities/registry.yaml",
        },
      ],
    });

    expect(entityGovernance(store)).toHaveLength(0);
  });

  it("errors on duplicate active aliases", () => {
    const store = makeStore({
      entities: [
        {
          data: {
            id: "ent-owner",
            kind: "owner",
            name: "Owner",
            status: "active",
            privacy_scope: "owner_private",
            aliases: ["markus"],
          },
          file: "entities/registry.yaml",
        },
        {
          data: {
            id: "ent-person",
            kind: "person",
            name: "Markus Duplicate",
            status: "active",
            privacy_scope: "owner_private",
            aliases: ["markus"],
          },
          file: "entities/registry.yaml",
        },
        {
          data: {
            id: "ent-agent",
            kind: "agent",
            name: "Cristalina",
            status: "active",
            privacy_scope: "owner_private",
            channels: ["owner_private_runtime"],
          },
          file: "entities/registry.yaml",
        },
      ],
    });

    const diags = entityGovernance(store);
    expect(diags.some((diag) => diag.rule === "entity-governance/duplicate-alias")).toBe(true);
  });

  it("errors when active owner or agent cardinality is invalid", () => {
    const store = makeStore({
      entities: [{
        data: {
          id: "ent-owner-a",
          kind: "owner",
          name: "Owner A",
          status: "active",
          privacy_scope: "owner_private",
        },
        file: "entities/registry.yaml",
      }, {
        data: {
          id: "ent-owner-b",
          kind: "owner",
          name: "Owner B",
          status: "active",
          privacy_scope: "owner_private",
        },
        file: "entities/registry.yaml",
      }],
    });

    const diags = entityGovernance(store);
    expect(diags.some((diag) => diag.rule === "entity-governance/owner-cardinality")).toBe(true);
    expect(diags.some((diag) => diag.rule === "entity-governance/agent-cardinality")).toBe(true);
  });
});
