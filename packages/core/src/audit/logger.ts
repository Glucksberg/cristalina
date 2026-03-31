import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { AuditEntry } from "../operations/types.js";
import { appendLogLine } from "../store/writer.js";
import { auditLogPath } from "../store/paths.js";

export class AuditLogger {
  private root: string;

  constructor(root: string) {
    this.root = root;
  }

  /** Append an audit entry to the changes log */
  log(entry: AuditEntry): void {
    appendLogLine(this.root, auditLogPath(), JSON.stringify(entry));
  }

  /** Read all audit entries */
  readLog(): AuditEntry[] {
    const fullPath = resolve(this.root, auditLogPath());
    if (!existsSync(fullPath)) return [];
    const content = readFileSync(fullPath, "utf-8");
    return content
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as AuditEntry);
  }

  /** Read audit entries for a specific target ID */
  historyFor(targetId: string): AuditEntry[] {
    return this.readLog().filter(
      (entry) => entry.targets.includes(targetId) || entry.produced.includes(targetId),
    );
  }
}
