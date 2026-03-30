import { describe, it, expect } from "vitest";
import { scopeEscalation } from "../../src/rules/scope-escalation.js";
import type { ParsedStore } from "../../src/store/reader.js";

function makeStore(coreObjects: ParsedStore["coreObjects"]): ParsedStore {
  return {
    root: "/test", manifest: null, manifestFile: null,
    events: [], proposals: [], coreObjects, contradictions: [],
    files: [], parseErrors: [],
  };
}

describe("scopeEscalation rule", () => {
  it("detects automatic scope escalation (agent source)", () => {
    const store = makeStore([
      { data: { id: "fact-001", privacy_scope: "owner_private" }, file: "core/ratified/facts.yaml" },
      {
        data: { id: "fact-002", privacy_scope: "public_safe", supersedes: ["fact-001"], source_type: "agent_inference" },
        file: "core/ratified/facts.yaml",
      },
    ]);
    const diags = scopeEscalation(store);
    expect(diags.some((d) => d.rule === "scope-escalation/automatic")).toBe(true);
  });

  it("allows human-approved escalation", () => {
    const store = makeStore([
      { data: { id: "fact-001", privacy_scope: "owner_private" }, file: "core/ratified/facts.yaml" },
      {
        data: { id: "fact-002", privacy_scope: "shareable", supersedes: ["fact-001"], source_type: "human_reply" },
        file: "core/ratified/facts.yaml",
      },
    ]);
    const diags = scopeEscalation(store);
    expect(diags).toHaveLength(0);
  });

  it("no escalation when scope stays the same", () => {
    const store = makeStore([
      { data: { id: "fact-001", privacy_scope: "owner_private" }, file: "core/ratified/facts.yaml" },
      {
        data: { id: "fact-002", privacy_scope: "owner_private", supersedes: ["fact-001"], source_type: "agent_inference" },
        file: "core/ratified/facts.yaml",
      },
    ]);
    expect(scopeEscalation(store)).toHaveLength(0);
  });

  it("no escalation when scope decreases", () => {
    const store = makeStore([
      { data: { id: "fact-001", privacy_scope: "public_safe" }, file: "core/ratified/facts.yaml" },
      {
        data: { id: "fact-002", privacy_scope: "owner_private", supersedes: ["fact-001"], source_type: "agent_inference" },
        file: "core/ratified/facts.yaml",
      },
    ]);
    expect(scopeEscalation(store)).toHaveLength(0);
  });
});
