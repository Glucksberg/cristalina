/** Compute a simple diff between two objects, returning changed fields */
export function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { old: unknown; new: unknown }> {
  const diff: Record<string, { old: unknown; new: unknown }> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const oldVal = before[key];
    const newVal = after[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = { old: oldVal, new: newVal };
    }
  }

  return diff;
}

/** Format a diff as a human-readable summary */
export function formatDiffSummary(diff: Record<string, { old: unknown; new: unknown }>): string {
  const changes = Object.entries(diff).map(([key, { old: oldVal, new: newVal }]) => {
    if (oldVal === undefined) return `+${key}`;
    if (newVal === undefined) return `-${key}`;
    return `~${key}`;
  });
  return changes.join(", ");
}
