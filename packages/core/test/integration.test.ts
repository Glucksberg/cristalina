import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { CristalinaStore } from "../src/store/store.js";
import { FixedClock } from "../src/clock/clock.js";
import { DeterministicIdGenerator } from "../src/id/generator.js";
import { executeOperation } from "../src/operations/index.js";
import { generateCurationPacket } from "../src/promotion/curation.js";
import { applyRatification } from "../src/promotion/ratification.js";
import { compile } from "../src/compiler/index.js";
import { createSnapshot, restoreSnapshot } from "../src/audit/rollback.js";
import { AuditLogger } from "../src/audit/logger.js";

let root: string;
let store: CristalinaStore;

beforeEach(() => {
  root = resolve(tmpdir(), `cristalina-test-${randomUUID()}`);
  mkdirSync(root, { recursive: true });
  store = new CristalinaStore({
    root,
    clock: new FixedClock("2026-03-29T12:00:00Z"),
    idGenerator: new DeterministicIdGenerator(),
  });
});

afterEach(() => {
  rmSync(root, { recursive: true });
});

describe("End-to-end lifecycle", () => {
  it("LOG -> PROPOSE -> curate -> ratify -> compile -> bootstrap", async () => {
    // 1. LOG some events
    await executeOperation(store, {
      op: "LOG", kind: "observation", summary: "User prefers concise replies.",
      source_type: "agent_inference", privacy_scope: "owner_private", actor: "fluck",
    });
    await executeOperation(store, {
      op: "LOG", kind: "observation", summary: "User values privacy highly.",
      source_type: "agent_inference", privacy_scope: "owner_private", actor: "fluck",
    });

    // 2. Seed a core object to revise against
    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-seed-001", kind: "preference", statement: "User may prefer concise answers.",
      status: "ratified", confidence: 0.6, source_type: "agent_inference", source_ref: "evt-test-001",
      created_at: "2026-03-29T10:00:00Z", last_confirmed_at: "2026-03-29T10:00:00Z",
      confirmed_by: "agent", evidence_count: 1, privacy_scope: "owner_private",
    });

    // 3. PROPOSE based on observations
    await executeOperation(store, {
      op: "PROPOSE",
      type: "revise_preference",
      operation: "supersede",
      target_ref: {
        object_id: "fact-seed-001",
        kind: "preference",
        facet: "communication_style",
      },
      candidate_payload: {
        kind: "preference",
        statement: "Use concise replies by default unless depth is requested.",
        privacy_scope: "owner_private",
        tags: ["communication", "style"],
      },
      reason: "User prefers concise replies.",
      provenance: {
        supporting_events: ["evt-test-001"],
      },
      confidence: 0.68,
      privacy_scope: "owner_private",
      risk: {
        level: "medium",
        requires_human_approval: true,
      },
    });

    // 4. Generate curation packet
    const snapshot = await store.read();
    const packet = generateCurationPacket(snapshot, store.clock, store.idGen);
    expect(packet).not.toBeNull();
    expect(packet!.questions.length).toBeGreaterThan(0);

    // 5. Simulate owner response: accept
    const result = await applyRatification(store, {
      responses: [
        { question_ref: packet!.questions[0].id, answer_type: "accept", answer_text: "Yes, concise." },
      ],
      questionToProposal: new Map([[packet!.questions[0].id, "prop-test-001"]]),
    });
    expect(result.applied.length).toBeGreaterThan(0);

    // 6. Compile context
    const compiled = await compile(store, { audience: "owner_private" });
    expect(compiled.hot).toBeTruthy();
    expect(compiled.bootstrap.soul).toContain("SOUL");
    expect(compiled.bootstrap.user).toContain("concise");

    // Verify files exist
    expect(existsSync(resolve(root, "compiled/bootstrap/SOUL.md"))).toBe(true);
    expect(existsSync(resolve(root, "compiled/bootstrap/MEMORY.md"))).toBe(true);
    expect(existsSync(resolve(root, "compiled/hot/session-pack.md"))).toBe(true);

    // 7. Verify audit trail
    const logger = new AuditLogger(root);
    const auditLog = logger.readLog();
    expect(auditLog.length).toBeGreaterThanOrEqual(4); // LOG x2 + PROPOSE + SUPERSEDE
    expect(auditLog.some((e) => e.operation === "LOG")).toBe(true);
    expect(auditLog.some((e) => e.operation === "PROPOSE")).toBe(true);
    expect(auditLog.some((e) => e.operation === "SUPERSEDE")).toBe(true);
  });
});

describe("Snapshot and rollback", () => {
  it("creates and restores a snapshot", async () => {
    // Seed data
    store.appendYamlItem("core/ratified/facts.yaml", {
      id: "fact-snap-001", kind: "fact", statement: "Original fact.",
      status: "ratified", confidence: 0.8, privacy_scope: "owner_private",
    });

    // Create snapshot
    const manifest = await createSnapshot(root, "before modification", store.clock);
    expect(manifest.files.length).toBeGreaterThan(0);
    expect(manifest.files.some((f) => f.path.includes("facts.yaml"))).toBe(true);

    // Modify the store
    store.updateYamlItem("core/ratified/facts.yaml", "fact-snap-001", { statement: "Modified fact." });
    let snapshot = await store.read();
    expect(snapshot.coreObjects[0].data.statement).toBe("Modified fact.");

    // Restore
    await restoreSnapshot(root, manifest.id);
    snapshot = await store.refresh();
    expect(snapshot.coreObjects[0].data.statement).toBe("Original fact.");
  });
});
