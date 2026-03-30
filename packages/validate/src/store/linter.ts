import type { Diagnostic } from "../diagnostics.js";
import { readStore, type ParsedStore } from "./reader.js";
import { validateManifest } from "./manifest-validator.js";
import { ALL_RULES, type Rule } from "../rules/index.js";

export interface LintOptions {
  /** Subset of rules to run. If omitted, all rules run. */
  rules?: Rule[];
}

export interface LintResult {
  diagnostics: Diagnostic[];
  fileCount: number;
  objectCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

/** Lint a .cristalina/ store: read, validate manifest, run all rules. */
export async function lintStore(storePath: string, options?: LintOptions): Promise<LintResult> {
  const store = await readStore(storePath);
  const diagnostics: Diagnostic[] = [...store.parseErrors];

  // Validate manifest
  diagnostics.push(...validateManifest(store));

  // Run rules
  const rules = options?.rules ?? ALL_RULES;
  for (const rule of rules) {
    diagnostics.push(...rule(store));
  }

  // Sort: errors first, then warnings, then info
  const severityOrder = { error: 0, warning: 1, info: 2 };
  diagnostics.sort((a, b) => {
    const diff = severityOrder[a.severity] - severityOrder[b.severity];
    if (diff !== 0) return diff;
    return (a.file ?? "").localeCompare(b.file ?? "");
  });

  return {
    diagnostics,
    fileCount: store.files.length,
    objectCount: store.events.length + store.proposals.length + store.coreObjects.length + store.contradictions.length,
    errorCount: diagnostics.filter((d) => d.severity === "error").length,
    warningCount: diagnostics.filter((d) => d.severity === "warning").length,
    infoCount: diagnostics.filter((d) => d.severity === "info").length,
  };
}
