export type Severity = "error" | "warning" | "info";

export interface Diagnostic {
  /** Severity level: error = MUST-level violation, warning = SHOULD-level, info = advisory */
  severity: Severity;
  /** Rule identifier, e.g. "privacy-scope/missing" */
  rule: string;
  /** Human-readable description of the issue */
  message: string;
  /** Relative file path within the .cristalina/ store */
  file?: string;
  /** Path within the file, e.g. "items[0].privacy_scope" */
  path?: string;
  /** Object ID if applicable, e.g. "fact-001" */
  objectId?: string;
}

export function error(rule: string, message: string, extra?: Partial<Diagnostic>): Diagnostic {
  return { severity: "error", rule, message, ...extra };
}

export function warning(rule: string, message: string, extra?: Partial<Diagnostic>): Diagnostic {
  return { severity: "warning", rule, message, ...extra };
}

export function info(rule: string, message: string, extra?: Partial<Diagnostic>): Diagnostic {
  return { severity: "info", rule, message, ...extra };
}

export function formatDiagnostic(d: Diagnostic): string {
  const location = [d.file, d.path].filter(Boolean).join(":");
  const prefix = location ? `${location}: ` : "";
  const id = d.objectId ? ` [${d.objectId}]` : "";
  return `${d.severity.toUpperCase()} (${d.rule}) ${prefix}${d.message}${id}`;
}
