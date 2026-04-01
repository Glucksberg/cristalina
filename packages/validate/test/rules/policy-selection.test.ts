import { describe, it, expect } from "vitest";
import { policySelection } from "../../src/rules/policy-selection.js";
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

describe("policySelection rule", () => {
  it("passes when a policy kind has a single active definition", () => {
    const store = makeStore({
      policyObjects: [{
        data: {
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
        },
        file: "policy/audience.yaml",
      }],
    });

    expect(policySelection(store)).toHaveLength(0);
  });

  it("errors when a policy kind has multiple active definitions", () => {
    const store = makeStore({
      policyObjects: [
        {
          data: {
            id: "pol-audience-a",
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
          },
          file: "policy/audience-a.yaml",
        },
        {
          data: {
            id: "pol-audience-b",
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
          },
          file: "policy/audience-b.yaml",
        },
      ],
    });

    const diags = policySelection(store);
    expect(diags).toHaveLength(2);
    expect(diags.every((diag) => diag.rule === "policy-selection/multiple-active")).toBe(true);
  });

  it("errors when multiple non-deprecated policies exist without an active selector", () => {
    const store = makeStore({
      policyObjects: [
        {
          data: {
            id: "pol-proj-a",
            kind: "projection_policy",
            status: "draft",
            default_profiles: {
              owner_private: "deep",
              agent_operational: "standard",
              project_private: "standard",
              shareable: "standard",
              public_safe: "tiny",
            },
            tier_limits: {
              tiny: { hot: 8, warm: 6, cold: 8 },
              standard: { hot: 14, warm: 18, cold: 24 },
              deep: { hot: 24, warm: 40, cold: 60 },
            },
          },
          file: "policy/projection-a.yaml",
        },
        {
          data: {
            id: "pol-proj-b",
            kind: "projection_policy",
            status: "draft",
            default_profiles: {
              owner_private: "deep",
              agent_operational: "standard",
              project_private: "standard",
              shareable: "standard",
              public_safe: "tiny",
            },
            tier_limits: {
              tiny: { hot: 8, warm: 6, cold: 8 },
              standard: { hot: 14, warm: 18, cold: 24 },
              deep: { hot: 24, warm: 40, cold: 60 },
            },
          },
          file: "policy/projection-b.yaml",
        },
      ],
    });

    const diags = policySelection(store);
    expect(diags).toHaveLength(2);
    expect(diags.every((diag) => diag.rule === "policy-selection/ambiguous")).toBe(true);
  });
});
