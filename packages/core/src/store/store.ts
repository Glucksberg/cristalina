import { readStore, lintStore, type ParsedStore, type ParsedObject, type LintResult } from "@cristalina/validate";
import type { Clock } from "../clock/clock.js";
import { SystemClock } from "../clock/clock.js";
import type { IdGenerator } from "../id/generator.js";
import { DefaultIdGenerator } from "../id/generator.js";
import { appendJsonlLine, writeYamlFile, appendToYamlItems, updateYamlItem, appendLogLine } from "./writer.js";

export interface StoreOptions {
  root: string;
  clock?: Clock;
  idGenerator?: IdGenerator;
}

export class CristalinaStore {
  readonly root: string;
  readonly clock: Clock;
  readonly idGen: IdGenerator;
  private _snapshot: ParsedStore | null = null;

  constructor(options: StoreOptions) {
    this.root = options.root;
    this.clock = options.clock ?? new SystemClock();
    this.idGen = options.idGenerator ?? new DefaultIdGenerator(this.clock);
  }

  /** Read the store (cached until invalidated by a write) */
  async read(): Promise<ParsedStore> {
    if (!this._snapshot) {
      this._snapshot = await readStore(this.root);
      // Seed ID generator from existing IDs
      if (this.idGen instanceof DefaultIdGenerator) {
        const allIds: string[] = [];
        for (const obj of this._snapshot.events) {
          if (typeof obj.data.id === "string") allIds.push(obj.data.id);
        }
        for (const obj of this._snapshot.coreObjects) {
          if (typeof obj.data.id === "string") allIds.push(obj.data.id);
        }
        for (const obj of this._snapshot.proposals) {
          if (typeof obj.data.id === "string") allIds.push(obj.data.id);
        }
        for (const obj of this._snapshot.curationPackets) {
          if (typeof obj.data.packet_id === "string") allIds.push(obj.data.packet_id);
        }
        for (const obj of this._snapshot.contradictions) {
          if (typeof obj.data.id === "string") allIds.push(obj.data.id);
        }
        for (const obj of this._snapshot.entities) {
          if (typeof obj.data.id === "string") allIds.push(obj.data.id);
        }
        for (const obj of this._snapshot.policyObjects) {
          if (typeof obj.data.id === "string") allIds.push(obj.data.id);
        }
        this.idGen.seedFromIds(allIds);
      }
    }
    return this._snapshot;
  }

  /** Force a fresh read from disk */
  async refresh(): Promise<ParsedStore> {
    this._snapshot = null;
    return this.read();
  }

  /** Invalidate the cache (called after writes) */
  invalidate(): void {
    this._snapshot = null;
  }

  /** Validate the store using @cristalina/validate linter */
  async validate(): Promise<LintResult> {
    return lintStore(this.root);
  }

  /** Find an object by ID across all collections */
  async findById(id: string): Promise<ParsedObject | null> {
    const store = await this.read();
    for (const collections of [
      store.events,
      store.coreObjects,
      store.proposals,
      store.curationPackets,
      store.contradictions,
      store.entities,
      store.policyObjects,
    ]) {
      for (const obj of collections) {
        if (obj.data.id === id) return obj;
        if (obj.data.packet_id === id) return obj;
      }
    }
    return null;
  }

  // --- Low-level write operations ---

  appendJsonl(relPath: string, data: Record<string, unknown>): void {
    appendJsonlLine(this.root, relPath, data);
    this.invalidate();
  }

  writeYaml(relPath: string, data: Record<string, unknown>): void {
    writeYamlFile(this.root, relPath, data);
    this.invalidate();
  }

  appendYamlItem(relPath: string, item: Record<string, unknown>, arrayKey?: string): void {
    appendToYamlItems(this.root, relPath, item, arrayKey);
    this.invalidate();
  }

  updateYamlItem(relPath: string, id: string, patch: Record<string, unknown>, arrayKey?: string): boolean {
    const result = updateYamlItem(this.root, relPath, id, patch, arrayKey);
    if (result) this.invalidate();
    return result;
  }

  /** Append to a log file. Does not invalidate cache (logs are not read by readStore). */
  appendLog(relPath: string, line: string): void {
    appendLogLine(this.root, relPath, line);
  }
}
