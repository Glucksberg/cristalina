/** Metadata for a store snapshot (SPEC.md §20) */
export interface SnapshotManifest {
  /** Unique snapshot identifier */
  id: string;
  /** When the snapshot was taken */
  created_at: string;
  /** Human-readable reason for the snapshot */
  reason?: string;
  /** List of files included, with checksums */
  files: SnapshotFileEntry[];
  /** Protocol version at time of snapshot */
  protocol_version: string;
}

export interface SnapshotFileEntry {
  /** Relative path within the store */
  path: string;
  /** SHA-256 checksum of the file content */
  sha256: string;
  /** File size in bytes */
  size: number;
}

/**
 * What a valid backup directory should look like.
 * Phase 1 defines these expectations; Phase 2 implements them.
 */
export interface BackupExpectation {
  /** backups/snapshots/ should contain timestamped subdirectories */
  snapshotDir: "backups/snapshots";
  /** Each snapshot subdirectory should contain a manifest.yaml */
  manifestFile: "manifest.yaml";
  /** Snapshots should be restorable */
  restorable: true;
}

export const BACKUP_EXPECTATIONS: BackupExpectation = {
  snapshotDir: "backups/snapshots",
  manifestFile: "manifest.yaml",
  restorable: true,
};
