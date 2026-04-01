import type { Diagnostic } from "../diagnostics.js";
import { warning, info } from "../diagnostics.js";
import type { ParsedStore } from "../store/reader.js";

const RULE = "store-structure";

// Expected top-level directories in a .cristalina/ store (SPEC.md §7)
const EXPECTED_DIRS = [
  "events",
  "proposals",
  "core",
  "entities",
  "policy",
  "compiled",
] as const;

// Expected core subdirectories
const EXPECTED_CORE_DIRS = [
  "core/ratified",
  "core/identity",
  "core/values",
] as const;

// Optional directories
const OPTIONAL_DIRS = [
  "protocol",
  "core/narrative",
  "core/digests",
  "compiled/hot",
  "compiled/warm",
  "compiled/cold",
  "compiled/bootstrap",
  "audits",
  "backups",
] as const;

/** Validate the directory layout of a .cristalina/ store. */
export function storeStructure(store: ParsedStore): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Build a set of known directory prefixes from files
  const dirPrefixes = new Set<string>();
  for (const file of store.files) {
    const parts = file.split("/");
    for (let i = 1; i <= parts.length - 1; i++) {
      dirPrefixes.add(parts.slice(0, i).join("/"));
    }
  }

  // Check expected top-level directories
  for (const dir of EXPECTED_DIRS) {
    if (!dirPrefixes.has(dir)) {
      diagnostics.push(
        warning(`${RULE}/missing-dir`, `Expected directory not found: ${dir}/`),
      );
    }
  }

  // Check expected core subdirectories
  for (const dir of EXPECTED_CORE_DIRS) {
    if (!dirPrefixes.has(dir)) {
      diagnostics.push(
        warning(`${RULE}/missing-core-dir`, `Expected core directory not found: ${dir}/`),
      );
    }
  }

  // Check event file naming convention (YYYY-MM/YYYY-MM-DD.jsonl)
  const eventFiles = store.files.filter((f) => f.startsWith("events/"));
  const eventPattern = /^events\/\d{4}-\d{2}\/\d{4}-\d{2}-\d{2}\.jsonl$/;
  for (const file of eventFiles) {
    if (!eventPattern.test(file)) {
      diagnostics.push(
        info(`${RULE}/event-naming`, `Event file does not follow YYYY-MM/YYYY-MM-DD.jsonl convention: ${file}`, {
          file,
        }),
      );
    }
  }

  // Check proposal file naming convention
  const proposalFiles = store.files.filter((f) => f.startsWith("proposals/"));
  const proposalDirPattern = /^proposals\/\d{4}-\d{2}\//;
  for (const file of proposalFiles) {
    if (!proposalDirPattern.test(file)) {
      diagnostics.push(
        info(`${RULE}/proposal-naming`, `Proposal file not in YYYY-MM/ directory: ${file}`, {
          file,
        }),
      );
    }
  }

  return diagnostics;
}
