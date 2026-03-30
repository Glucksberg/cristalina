// Diagnostics
export {
  type Diagnostic,
  type Severity,
  error,
  warning,
  info,
  formatDiagnostic,
} from "./diagnostics.js";

// Store reader
export { readStore, type ParsedStore, type ParsedObject } from "./store/reader.js";

// Manifest validator
export { validateManifest } from "./store/manifest-validator.js";

// Linter
export { lintStore, type LintResult, type LintOptions } from "./store/linter.js";

// Rules
export {
  ALL_RULES,
  type Rule,
  schemaConformance,
  idPrefix,
  privacyScope,
  confidenceRange,
  requiredProvenance,
  statusConsistency,
  supersessionIntegrity,
  contradictionIntegrity,
  scopeEscalation,
  storeStructure,
} from "./rules/index.js";

// Snapshot
export {
  type SnapshotManifest,
  type SnapshotFileEntry,
  type BackupExpectation,
  BACKUP_EXPECTATIONS,
} from "./snapshot/types.js";
export { snapshotExpectations } from "./snapshot/expectations.js";
