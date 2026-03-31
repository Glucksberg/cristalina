import { describe, it, expect } from "vitest";
import {
  eventFilePath, proposalDirPath, pendingProposalsPath, curationPacketPath,
  coreFilePath, contradictionFilePath, auditLogPath, snapshotDirPath,
  channelCompiledPath, contractPathForCompiledArtifact,
} from "../../src/store/paths.js";

describe("paths", () => {
  it("eventFilePath", () => {
    expect(eventFilePath("2026-03-29")).toBe("events/2026-03/2026-03-29.jsonl");
  });

  it("proposalDirPath", () => {
    expect(proposalDirPath("2026-03-29")).toBe("proposals/2026-03");
  });

  it("pendingProposalsPath", () => {
    expect(pendingProposalsPath("2026-03-29")).toBe("proposals/2026-03/pending-updates.yaml");
  });

  it("curationPacketPath", () => {
    expect(curationPacketPath("2026-03-29")).toBe("proposals/2026-03/daily-curation-2026-03-29.yaml");
  });

  it("coreFilePath maps kinds correctly", () => {
    expect(coreFilePath("fact")).toBe("core/ratified/facts.yaml");
    expect(coreFilePath("preference")).toBe("core/ratified/facts.yaml");
    expect(coreFilePath("value")).toBe("core/values/values.yaml");
    expect(coreFilePath("identity_trait")).toBe("core/identity/soul.yaml");
    expect(coreFilePath("style_rule")).toBe("core/identity/style.yaml");
    expect(coreFilePath("relationship")).toBe("core/ratified/relationships.yaml");
  });

  it("contradictionFilePath", () => {
    expect(contradictionFilePath()).toBe("core/ratified/contradictions.yaml");
  });

  it("auditLogPath", () => {
    expect(auditLogPath()).toBe("audits/changes.log");
  });

  it("snapshotDirPath sanitizes timestamp", () => {
    expect(snapshotDirPath("2026-03-29T12:00:00Z")).toBe("backups/snapshots/2026-03-29T120000Z");
  });

  it("channelCompiledPath namespaces compiled outputs by channel", () => {
    expect(channelCompiledPath("group_channel", "compiled/bootstrap/MEMORY.md"))
      .toBe("compiled/channels/group_channel/bootstrap/MEMORY.md");
  });

  it("contractPathForCompiledArtifact maps namespaced paths back to canonical contract paths", () => {
    expect(contractPathForCompiledArtifact("compiled/channels/group_channel/bootstrap/MEMORY.md"))
      .toBe("compiled/bootstrap/MEMORY.md");
  });
});
