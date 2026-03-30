import type { Diagnostic } from "../diagnostics.js";
import { info } from "../diagnostics.js";
import type { ParsedStore } from "../store/reader.js";

const RULE = "snapshot-expectations";

/** Check that the backups directory meets basic expectations. */
export function snapshotExpectations(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const hasBackupsDir = store.files.some((f) => f.startsWith("backups/"));

  if (!hasBackupsDir) {
    diagnostics.push(
      info(`${RULE}/no-backups`, "No backups/ directory found. Consider adding snapshot support."),
    );
    return diagnostics;
  }

  const hasSnapshots = store.files.some((f) => f.startsWith("backups/snapshots/"));
  if (!hasSnapshots) {
    diagnostics.push(
      info(`${RULE}/no-snapshots`, "backups/ exists but no snapshots/ subdirectory found."),
    );
  }

  return diagnostics;
}
