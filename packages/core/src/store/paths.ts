import type { MemoryObjectKind } from "@cristalina/types";

/** Compute event JSONL file path from a date string (YYYY-MM-DD) */
export function eventFilePath(dateStr: string): string {
  const month = dateStr.slice(0, 7);
  return `events/${month}/${dateStr}.jsonl`;
}

/** Compute proposal directory path from a date string */
export function proposalDirPath(dateStr: string): string {
  const month = dateStr.slice(0, 7);
  return `proposals/${month}`;
}

/** Compute pending proposals file path */
export function pendingProposalsPath(dateStr: string): string {
  return `${proposalDirPath(dateStr)}/pending-updates.yaml`;
}

/** Compute daily curation packet path */
export function curationPacketPath(dateStr: string): string {
  return `${proposalDirPath(dateStr)}/daily-curation-${dateStr}.yaml`;
}

/** Compute core file path by memory object kind */
export function coreFilePath(kind: MemoryObjectKind | string): string {
  switch (kind) {
    case "fact":
    case "preference":
    case "constraint":
    case "project":
    case "belief":
      return "core/ratified/facts.yaml";
    case "relationship":
      return "core/ratified/relationships.yaml";
    case "value":
    case "priority":
      return "core/values/values.yaml";
    case "identity_trait":
      return "core/identity/soul.yaml";
    case "style_rule":
      return "core/identity/style.yaml";
    default:
      return "core/ratified/facts.yaml";
  }
}

/** Compute contradiction file path (under core/ so the reader can discover it) */
export function contradictionFilePath(): string {
  return "core/ratified/contradictions.yaml";
}

/** Compute audit log path */
export function auditLogPath(): string {
  return "audits/changes.log";
}

/** Compute validation log path */
export function validationLogPath(): string {
  return "audits/validation.log";
}

/** Compute snapshot directory path from ISO timestamp */
export function snapshotDirPath(isoTimestamp: string): string {
  const safe = isoTimestamp.replace(/[:.]/g, "");
  return `backups/snapshots/${safe}`;
}

/** Compiled context paths */
export const COMPILED_PATHS = {
  hot: "compiled/hot/session-pack.md",
  warmDir: "compiled/warm",
  cold: "compiled/cold/deep-recall-index.yaml",
  bootstrapSoul: "compiled/bootstrap/SOUL.md",
  bootstrapValue: "compiled/bootstrap/VALUE.md",
  bootstrapUser: "compiled/bootstrap/USER.md",
  bootstrapMemory: "compiled/bootstrap/MEMORY.md",
} as const;
