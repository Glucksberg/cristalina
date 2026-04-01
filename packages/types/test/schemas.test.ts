import { describe, it, expect } from "vitest";
import {
  EventSchema,
  ProposalSchema,
  MemoryObjectSchema,
  RelationshipSchema,
  ContradictionSchema,
  ManifestSchema,
  AdapterWritebackContractSchema,
  ProjectionManifestSchema,
  DerivedArtifactSchema,
  StableReferenceSchema,
  EntitySchema,
  PolicyObjectSchema,
  PrivacyScope,
  MemoryStatus,
  ProposalStatus,
  EventKind,
  canAudienceAccessScope,
  isScopeEscalation,
  newlyVisibleAudiences,
} from "../src/index.js";

describe("EventSchema", () => {
  it("accepts a valid event", () => {
    const result = EventSchema.safeParse({
      id: "evt-2026-03-29-001",
      kind: "runtime_drift",
      ts: "2026-03-29T02:00:00Z",
      summary: "Test event",
      source_type: "runtime_observation",
      privacy_scope: "agent_operational",
    });
    expect(result.success).toBe(true);
  });

  it("rejects event with wrong ID prefix", () => {
    const result = EventSchema.safeParse({
      id: "bad-001",
      kind: "heartbeat",
      ts: "2026-03-29T02:00:00Z",
      summary: "Test",
      source_type: "runtime_observation",
      privacy_scope: "agent_operational",
    });
    expect(result.success).toBe(false);
  });

  it("rejects event with invalid kind", () => {
    const result = EventSchema.safeParse({
      id: "evt-001",
      kind: "INVALID",
      ts: "2026-03-29T02:00:00Z",
      summary: "Test",
      source_type: "runtime_observation",
      privacy_scope: "agent_operational",
    });
    expect(result.success).toBe(false);
  });
});

describe("ProposalSchema", () => {
  it("accepts a valid proposal", () => {
    const result = ProposalSchema.safeParse({
      id: "prop-001",
      type: "new_fact",
      operation: "create",
      target_ref: {
        kind: "fact",
        facet: "working_preferences",
      },
      candidate_payload: {
        kind: "fact",
        statement: "User prefers concise operational replies.",
        privacy_scope: "owner_private",
      },
      reason: "Test proposal",
      provenance: {
        supporting_events: ["evt-001"],
      },
      confidence: 0.68,
      status: "pending",
      privacy_scope: "owner_private",
      risk: {
        level: "medium",
        requires_human_approval: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it("uses the correct status enum (not the old one)", () => {
    const badResult = ProposalSchema.safeParse({
      id: "prop-001",
      type: "new_fact",
      operation: "create",
      target_ref: { kind: "fact" },
      candidate_payload: {
        kind: "fact",
        statement: "test",
        privacy_scope: "owner_private",
      },
      reason: "test",
      provenance: { supporting_events: [] },
      confidence: 0.5,
      status: "accepted",
      privacy_scope: "owner_private",
    });
    expect(badResult.success).toBe(false);

    const goodResult = ProposalSchema.safeParse({
      id: "prop-001",
      type: "new_fact",
      operation: "create",
      target_ref: { kind: "fact" },
      candidate_payload: {
        kind: "fact",
        statement: "test",
        privacy_scope: "owner_private",
      },
      reason: "test",
      provenance: { supporting_events: [] },
      confidence: 0.5,
      status: "approved",
      privacy_scope: "owner_private",
    });
    expect(goodResult.success).toBe(true);
  });

  it("requires object_id for non-create operations", () => {
    const result = ProposalSchema.safeParse({
      id: "prop-001",
      type: "revise_fact",
      operation: "revise",
      target_ref: { kind: "fact" },
      candidate_payload: {
        kind: "fact",
        statement: "Updated statement",
        privacy_scope: "owner_private",
      },
      reason: "test",
      provenance: { supporting_events: ["evt-001"] },
      confidence: 0.7,
      status: "pending",
      privacy_scope: "owner_private",
    });
    expect(result.success).toBe(false);
  });

  it("accepts entity-based target refs for create proposals", () => {
    const result = ProposalSchema.safeParse({
      id: "prop-001",
      type: "new_fact",
      operation: "create",
      target_ref: {
        entity_id: "ent-owner",
        kind: "owner",
        facet: "working_preferences",
      },
      candidate_payload: {
        kind: "fact",
        statement: "User prefers concise replies in ops mode.",
        privacy_scope: "owner_private",
        related_entities: ["ent-owner"],
      },
      reason: "Test proposal",
      provenance: {
        supporting_events: ["evt-001"],
      },
      confidence: 0.68,
      status: "pending",
      privacy_scope: "owner_private",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-canonical target object IDs", () => {
    const result = ProposalSchema.safeParse({
      id: "prop-001",
      type: "revise_fact",
      operation: "revise",
      target_ref: {
        object_id: "evt-001",
        kind: "fact",
      },
      candidate_payload: {
        kind: "fact",
        statement: "Updated statement",
        privacy_scope: "owner_private",
      },
      reason: "test",
      provenance: { supporting_events: ["evt-001"] },
      confidence: 0.7,
      status: "pending",
      privacy_scope: "owner_private",
    });
    expect(result.success).toBe(false);
  });

  it("accepts multi-intent follow-up payloads", () => {
    const result = ProposalSchema.safeParse({
      id: "prop-001",
      type: "identity_adjustment",
      operation: "supersede",
      target_ref: {
        object_id: "sty-001",
        kind: "style_rule",
        facet: "style",
      },
      candidate_payload: {
        kind: "style_rule",
        statement: "Be concise by default for operational work.",
        privacy_scope: "owner_private",
        follow_up_payloads: [{
          kind: "constraint",
          statement: "Expand only when the owner explicitly asks for depth.",
          privacy_scope: "owner_private",
        }],
      },
      reason: "test",
      provenance: { supporting_events: ["evt-001"] },
      confidence: 0.7,
      status: "pending",
      privacy_scope: "owner_private",
    });
    expect(result.success).toBe(true);
  });
});

describe("MemoryObjectSchema", () => {
  it("requires all provenance fields", () => {
    const result = MemoryObjectSchema.safeParse({
      id: "fact-001",
      kind: "fact",
      statement: "Test",
      status: "ratified",
      confidence: 0.9,
      privacy_scope: "owner_private",
    });
    expect(result.success).toBe(false);
  });
});

describe("StableReferenceSchema", () => {
  it("accepts entity and object locators", () => {
    const result = StableReferenceSchema.safeParse({
      entity_id: "ent-owner",
      object_id: "fact-001",
      kind: "owner",
      facet: "working_preferences",
      label: "owner preference context",
    });
    expect(result.success).toBe(true);
  });
});

describe("EntitySchema", () => {
  it("accepts governed entity registry entries", () => {
    const result = EntitySchema.safeParse({
      id: "ent-owner",
      kind: "owner",
      name: "Owner",
      status: "active",
      privacy_scope: "owner_private",
      aliases: ["markus"],
      created_at: "2026-03-29T02:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("PolicyObjectSchema", () => {
  it("accepts audience policy objects", () => {
    const result = PolicyObjectSchema.safeParse({
      id: "pol-audience-default",
      kind: "audience_policy",
      status: "active",
      default_scope: "owner_private",
      policy_mode: "audience_aware",
      escalation_rule: "no_automatic_privacy_escalation",
      audiences: {
        owner_private: { can_view: ["owner_private", "agent_operational", "project_private", "shareable", "public_safe"] },
        agent_operational: { can_view: ["agent_operational", "shareable", "public_safe"] },
        project_private: { can_view: ["project_private", "shareable", "public_safe"] },
        shareable: { can_view: ["shareable", "public_safe"] },
        public_safe: { can_view: ["public_safe"] },
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("RelationshipSchema", () => {
  it("accepts stable endpoint refs", () => {
    const result = RelationshipSchema.safeParse({
      id: "rel-001",
      kind: "relationship",
      from_ref: {
        entity_id: "ent-owner",
        kind: "owner",
      },
      relation: "prefers",
      to_ref: {
        object_id: "fact-001",
        kind: "fact",
        label: "concise answers",
      },
      status: "ratified",
      confidence: 0.91,
      source_type: "human_reply",
      source_ref: "q-2",
      privacy_scope: "owner_private",
    });
    expect(result.success).toBe(true);
  });

  it("keeps legacy textual endpoints valid during migration", () => {
    const result = RelationshipSchema.safeParse({
      id: "rel-001",
      kind: "relationship",
      from: "user",
      relation: "prefers",
      to: "concise_answers",
      status: "ratified",
      confidence: 0.91,
      source_type: "human_reply",
      source_ref: "q-2",
      privacy_scope: "owner_private",
    });
    expect(result.success).toBe(true);
  });
});

describe("Enums", () => {
  it("PrivacyScope has 5 values", () => {
    expect(PrivacyScope.options).toHaveLength(5);
  });

  it("ProposalStatus matches DATA-MODEL.md", () => {
    expect(ProposalStatus.options).toContain("queued_for_curation");
    expect(ProposalStatus.options).toContain("approved");
    expect(ProposalStatus.options).toContain("applied");
    expect(ProposalStatus.options).toContain("expired");
    expect(ProposalStatus.options).not.toContain("accepted");
    expect(ProposalStatus.options).not.toContain("superseded");
  });
});

describe("DerivedArtifactSchema", () => {
  it("accepts projection metadata with writeback contract fields", () => {
    const result = DerivedArtifactSchema.safeParse({
      id: "drv-2026-03-29-001",
      artifact_type: "bootstrap_soul",
      created_at: "2026-03-29T02:00:00Z",
      derived_from: ["fact-001", "idt-001"],
      intended_audience: "owner_private",
      generated_by: "cristalina-openclaw",
      source: "canonical_projection",
      path: "compiled/bootstrap/SOUL.md",
      projection_id: "drv-2026-03-29-000",
      projection_profile: "deep",
      writeback_mode: "proposal_extraction",
      parsable: true,
      checksum: "abc123",
      machine_extractable_sections: ["identity", "style"],
    });
    expect(result.success).toBe(true);
  });
});

describe("AdapterWritebackContractSchema", () => {
  it("accepts explicit proposal extraction contracts", () => {
    const result = AdapterWritebackContractSchema.safeParse({
      adapter: "cristalina-openclaw",
      writeback_mode: "proposal_extraction",
      default_source_type: "runtime_observation",
      files: [{
        path: "compiled/bootstrap/SOUL.md",
        artifact_type: "bootstrap_soul",
        parsable: true,
        machine_extractable_sections: ["identity"],
        default_confidence: 0.7,
        requires_human_review: true,
        allowed_operations: ["revise"],
        provenance_source: "openclaw_projection_drift",
      }],
    });
    expect(result.success).toBe(true);
  });
});

describe("ProjectionManifestSchema", () => {
  it("accepts projection manifests with artifacts and contract", () => {
    const result = ProjectionManifestSchema.safeParse({
      projection_id: "drv-2026-03-29-010",
      adapter: "cristalina-openclaw",
      generated_at: "2026-03-29T02:00:00Z",
      audience: "owner_private",
      projection_profile: "deep",
      writeback_mode: "proposal_extraction",
      artifacts: [{
        id: "drv-2026-03-29-011",
        artifact_type: "bootstrap_memory",
        created_at: "2026-03-29T02:00:00Z",
        derived_from: ["fact-001"],
        intended_audience: "owner_private",
        generated_by: "cristalina-openclaw",
        source: "canonical_projection",
        path: "compiled/bootstrap/MEMORY.md",
        projection_id: "drv-2026-03-29-010",
        projection_profile: "deep",
        writeback_mode: "proposal_extraction",
        parsable: true,
        checksum: "abc123",
      }],
      contract: {
        adapter: "cristalina-openclaw",
        writeback_mode: "proposal_extraction",
        default_source_type: "runtime_observation",
        files: [{
          path: "compiled/bootstrap/MEMORY.md",
          artifact_type: "bootstrap_memory",
          parsable: true,
          machine_extractable_sections: ["active_memory"],
          default_confidence: 0.58,
          requires_human_review: true,
          allowed_operations: ["confirm"],
          provenance_source: "openclaw_projection_drift",
        }],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("isScopeEscalation", () => {
  it("detects escalation from private to public", () => {
    expect(isScopeEscalation("owner_private", "public_safe")).toBe(true);
  });

  it("does not flag same scope", () => {
    expect(isScopeEscalation("owner_private", "owner_private")).toBe(false);
  });

  it("does not flag de-escalation", () => {
    expect(isScopeEscalation("public_safe", "owner_private")).toBe(false);
  });

  it("flags cross-branch exposure when a new audience is introduced", () => {
    expect(isScopeEscalation("agent_operational", "project_private")).toBe(true);
    expect(newlyVisibleAudiences("agent_operational", "project_private")).toEqual(["project_private"]);
  });
});

describe("canAudienceAccessScope", () => {
  it("does not treat agent_operational and project_private as interchangeable", () => {
    expect(canAudienceAccessScope("agent_operational", "project_private")).toBe(false);
    expect(canAudienceAccessScope("project_private", "agent_operational")).toBe(false);
  });

  it("allows outward-safe scopes across internal audiences", () => {
    expect(canAudienceAccessScope("agent_operational", "shareable")).toBe(true);
    expect(canAudienceAccessScope("project_private", "shareable")).toBe(true);
    expect(canAudienceAccessScope("public_safe", "shareable")).toBe(false);
  });
});
