import { ID_PREFIXES } from "@cristalina/types";
import type { Clock } from "../clock/clock.js";

export type PrefixKey = keyof typeof ID_PREFIXES;

export interface IdGenerator {
  next(prefix: PrefixKey): string;
}

export class DefaultIdGenerator implements IdGenerator {
  private counters = new Map<string, number>();
  private clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  /** Scan existing IDs to initialize counters for the current date */
  seedFromIds(ids: string[]): void {
    const dateStr = this.clock.dateStr();
    for (const id of ids) {
      // Match pattern: prefix-YYYY-MM-DD-NNN or prefix-NNN
      const match = id.match(new RegExp(`^([a-z]+-(?:[a-z]+-)?)(${dateStr.replace(/-/g, "\\-")}-)?(\\d+)$`));
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[3], 10);
        const key = `${prefix}${dateStr}`;
        const current = this.counters.get(key) ?? 0;
        if (num >= current) {
          this.counters.set(key, num);
        }
      }
    }
  }

  next(prefix: PrefixKey): string {
    const pfx = ID_PREFIXES[prefix];
    const dateStr = this.clock.dateStr();
    const key = `${pfx}${dateStr}`;
    const current = this.counters.get(key) ?? 0;
    const next = current + 1;
    this.counters.set(key, next);
    return `${pfx}${dateStr}-${String(next).padStart(3, "0")}`;
  }
}

export class DeterministicIdGenerator implements IdGenerator {
  private counters = new Map<string, number>();

  next(prefix: PrefixKey): string {
    const pfx = ID_PREFIXES[prefix];
    const current = this.counters.get(pfx) ?? 0;
    const next = current + 1;
    this.counters.set(pfx, next);
    return `${pfx}test-${String(next).padStart(3, "0")}`;
  }
}
