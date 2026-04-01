import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolve } from "node:path";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { CristalinaStore } from "../../src/store/store.js";
import { FixedClock } from "../../src/clock/clock.js";
import { DeterministicIdGenerator } from "../../src/id/generator.js";
import { ingestProjectionDrift } from "../../src/adapter/writeback.js";

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

describe("ingestProjectionDrift", () => {
  it("turns parsable projection drift into drift evidence plus proposals", async () => {
    store.writeYaml("entities/registry.yaml", {
      items: [
        {
          id: "ent-owner",
          kind: "owner",
          name: "Owner",
          status: "active",
          privacy_scope: "owner_private",
        },
      ],
    });

    const previous = `---
generated_by: cristalina-openclaw
---

# USER

## Preferences
- Use concise replies.
`;

    const current = `---
generated_by: cristalina-openclaw
---

# USER

## Preferences
- Use concise replies.
- Prefer explicit architecture tradeoffs.
`;

    const result = await ingestProjectionDrift(store, {
      path: "compiled/bootstrap/USER.md",
      artifact_type: "bootstrap_user",
      projection_id: "drv-2026-03-29-001",
      audience: "owner_private",
      projection_profile: "deep",
      diff_summary: "manual edit",
      previous_content: previous,
      current_content: current,
    });

    expect(result.driftEvent.operation).toBe("LOG");
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].operation).toBe("PROPOSE");

    const snapshot = await store.read();
    expect(snapshot.events.some((event) => event.data.kind === "runtime_drift")).toBe(true);
    expect(snapshot.proposals).toHaveLength(1);
    expect(snapshot.proposals[0].data.candidate_payload).toMatchObject({
      kind: "preference",
      statement: "Prefer explicit architecture tradeoffs.",
    });
  });
});
