import { describe, it, expect } from "vitest";
import {
  EventSchema,
  ProposalSchema,
  MemoryObjectSchema,
  ContradictionSchema,
  ManifestSchema,
  PrivacyScope,
  MemoryStatus,
  ProposalStatus,
  EventKind,
  isScopeEscalation,
} from "../src/index.js";

describe("EventSchema", () => {
  it("accepts a valid event", () => {
    const result = EventSchema.safeParse({
      id: "evt-2026-03-29-001",
      kind: "heartbeat",
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
    // "accepted" was in the old broken schema — should now be "approved"
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

    // "approved" is the correct value
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
      // Missing: source_type, source_ref, created_at, etc.
    });
    expect(result.success).toBe(false);
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
});
