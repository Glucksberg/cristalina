import { readFileSync, existsSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import fg from "fast-glob";
import { parse as parseYaml } from "yaml";
import type { Diagnostic } from "../diagnostics.js";
import { error } from "../diagnostics.js";

export interface ParsedObject {
  /** Raw parsed data */
  data: Record<string, unknown>;
  /** Relative file path within the store */
  file: string;
  /** Index within the file (for JSONL or items arrays) */
  index?: number;
}

export interface ParsedStore {
  /** Absolute path to the .cristalina/ root */
  root: string;
  /** Parsed manifest (from protocol/manifest.yaml or root manifest.yaml) */
  manifest: Record<string, unknown> | null;
  /** Manifest file path relative to store */
  manifestFile: string | null;
  /** All parsed events */
  events: ParsedObject[];
  /** All parsed proposals */
  proposals: ParsedObject[];
  /** All parsed curation packets */
  curationPackets: ParsedObject[];
  /** All parsed core memory objects (from core/ratified/, core/values/, etc.) */
  coreObjects: ParsedObject[];
  /** All parsed contradictions */
  contradictions: ParsedObject[];
  /** Files discovered in the store */
  files: string[];
  /** Parse errors encountered during reading */
  parseErrors: Diagnostic[];
}

/** Read and parse a .cristalina/ store directory */
export async function readStore(storePath: string): Promise<ParsedStore> {
  const root = resolve(storePath);
  const parseErrors: Diagnostic[] = [];
  const events: ParsedObject[] = [];
  const proposals: ParsedObject[] = [];
  const curationPackets: ParsedObject[] = [];
  const coreObjects: ParsedObject[] = [];
  const contradictions: ParsedObject[] = [];

  if (!existsSync(root)) {
    parseErrors.push(error("store/not-found", `Store directory not found: ${root}`));
    return {
      root,
      manifest: null,
      manifestFile: null,
      events,
      proposals,
      curationPackets,
      coreObjects,
      contradictions,
      files: [],
      parseErrors,
    };
  }

  // Discover all files
  const pattern = "**/*";
  const allFiles = await fg(pattern, {
    cwd: root,
    dot: false,
    onlyFiles: true,
  });
  // Normalize separators to forward slash
  const files = allFiles.map((f) => f.replaceAll(sep, "/"));

  // Read manifest
  let manifest: Record<string, unknown> | null = null;
  let manifestFile: string | null = null;
  for (const candidate of ["protocol/manifest.yaml", "manifest.yaml"]) {
    if (files.includes(candidate)) {
      manifestFile = candidate;
      manifest = readYamlFile(resolve(root, candidate), candidate, parseErrors);
      break;
    }
  }

  // Read events (JSONL files in events/)
  for (const file of files.filter((f) => f.startsWith("events/") && f.endsWith(".jsonl"))) {
    const fullPath = resolve(root, file);
    const content = readFileSafe(fullPath, file, parseErrors);
    if (content === null) continue;

    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    for (let i = 0; i < lines.length; i++) {
      try {
        const data = JSON.parse(lines[i]) as Record<string, unknown>;
        events.push({ data, file, index: i });
      } catch {
        parseErrors.push(error("parse/json", `Invalid JSON at line ${i + 1}`, { file }));
      }
    }
  }

  // Read proposals and curation packets (YAML files in proposals/)
  for (const file of files.filter((f) => f.startsWith("proposals/") && f.endsWith(".yaml"))) {
    const data = readYamlFile(resolve(root, file), file, parseErrors);
    if (data === null) continue;

    if (looksLikeCurationPacket(data, file)) {
      curationPackets.push({ data, file });
      continue;
    }

    // Extract individual proposals from items arrays, or store as single object
    if (data.items && Array.isArray(data.items)) {
      for (let i = 0; i < data.items.length; i++) {
        proposals.push({ data: data.items[i] as Record<string, unknown>, file, index: i });
      }
    } else {
      proposals.push({ data, file });
    }
  }

  // Read core memory objects from core/ subdirectories
  const coreFiles = files.filter((f) => f.startsWith("core/") && f.endsWith(".yaml"));
  for (const file of coreFiles) {
    const data = readYamlFile(resolve(root, file), file, parseErrors);
    if (data === null) continue;

    // Check if it's a contradiction file
    const isContradiction = file.includes("contradiction");

    // Handle items arrays (e.g., facts.yaml with items: [...])
    if (data.items && Array.isArray(data.items)) {
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i] as Record<string, unknown>;
        const obj: ParsedObject = { data: item, file, index: i };
        if (isContradiction) {
          contradictions.push(obj);
        } else {
          coreObjects.push(obj);
        }
      }
    } else if (data.values && Array.isArray(data.values)) {
      // Handle values.yaml with values: [...]
      for (let i = 0; i < data.values.length; i++) {
        const item = data.values[i] as Record<string, unknown>;
        coreObjects.push({ data: item, file, index: i });
      }
    } else {
      // Single object file
      if (isContradiction) {
        contradictions.push({ data, file });
      } else {
        coreObjects.push({ data, file });
      }
    }
  }

  return {
    root,
    manifest,
    manifestFile,
    events,
    proposals,
    curationPackets,
    coreObjects,
    contradictions,
    files,
    parseErrors,
  };
}

function looksLikeCurationPacket(data: Record<string, unknown>, file: string): boolean {
  if (file.includes("daily-curation")) return true;
  if (typeof data.packet_id === "string") return true;
  return Array.isArray(data.questions);
}

function readFileSafe(fullPath: string, relPath: string, errors: Diagnostic[]): string | null {
  try {
    return readFileSync(fullPath, "utf-8");
  } catch (e) {
    errors.push(error("parse/read", `Failed to read file: ${(e as Error).message}`, { file: relPath }));
    return null;
  }
}

function readYamlFile(fullPath: string, relPath: string, errors: Diagnostic[]): Record<string, unknown> | null {
  const content = readFileSafe(fullPath, relPath, errors);
  if (content === null) return null;
  try {
    const data = parseYaml(content);
    if (data === undefined || data === null) {
      errors.push(error("parse/yaml", "YAML file is empty or contains no data", { file: relPath }));
      return null;
    }
    if (typeof data !== "object") {
      errors.push(error("parse/yaml", `YAML file parsed to ${typeof data}, expected object`, { file: relPath }));
      return null;
    }
    return data as Record<string, unknown>;
  } catch (e) {
    errors.push(error("parse/yaml", `Invalid YAML: ${(e as Error).message}`, { file: relPath }));
    return null;
  }
}
