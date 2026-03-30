import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { stringify as yamlStringify, parse as yamlParse } from "yaml";

/** Ensure a directory exists, creating parent dirs as needed */
export function ensureDir(dirPath: string): void {
  mkdirSync(dirPath, { recursive: true });
}

/** Append a JSON object as a line to a JSONL file */
export function appendJsonlLine(root: string, relPath: string, data: Record<string, unknown>): void {
  const fullPath = resolve(root, relPath);
  ensureDir(dirname(fullPath));
  const line = JSON.stringify(data) + "\n";
  appendFileSync(fullPath, line, "utf-8");
}

/** Write/overwrite a YAML file */
export function writeYamlFile(root: string, relPath: string, data: Record<string, unknown>): void {
  const fullPath = resolve(root, relPath);
  ensureDir(dirname(fullPath));
  const content = yamlStringify(data, { lineWidth: 120 });
  // Atomic write: write to temp then rename
  const tmpPath = fullPath + ".tmp";
  writeFileSync(tmpPath, content, "utf-8");
  renameSync(tmpPath, fullPath);
}

/** Read a YAML file's items array, push a new item, write back */
export function appendToYamlItems(
  root: string,
  relPath: string,
  item: Record<string, unknown>,
  arrayKey: string = "items",
): void {
  const fullPath = resolve(root, relPath);
  ensureDir(dirname(fullPath));

  let data: Record<string, unknown> = {};
  if (existsSync(fullPath)) {
    const content = readFileSync(fullPath, "utf-8");
    const parsed = yamlParse(content);
    if (typeof parsed === "object" && parsed !== null) {
      data = parsed as Record<string, unknown>;
    }
  }

  const arr = Array.isArray(data[arrayKey]) ? (data[arrayKey] as Record<string, unknown>[]) : [];
  arr.push(item);
  data[arrayKey] = arr;

  writeYamlFile(root, relPath, data);
}

/** Update a specific item in a YAML items array by ID */
export function updateYamlItem(
  root: string,
  relPath: string,
  id: string,
  patch: Record<string, unknown>,
  arrayKey: string = "items",
): boolean {
  const fullPath = resolve(root, relPath);
  if (!existsSync(fullPath)) return false;

  const content = readFileSync(fullPath, "utf-8");
  const parsed = yamlParse(content);
  if (typeof parsed !== "object" || parsed === null) return false;

  const data = parsed as Record<string, unknown>;
  const arr = data[arrayKey];
  if (!Array.isArray(arr)) return false;

  const index = arr.findIndex((item: unknown) => {
    return typeof item === "object" && item !== null && (item as Record<string, unknown>).id === id;
  });
  if (index === -1) return false;

  arr[index] = { ...(arr[index] as Record<string, unknown>), ...patch };
  data[arrayKey] = arr;

  writeYamlFile(root, relPath, data);
  return true;
}

/** Append a line to a plain text log file */
export function appendLogLine(root: string, relPath: string, line: string): void {
  const fullPath = resolve(root, relPath);
  ensureDir(dirname(fullPath));
  appendFileSync(fullPath, line + "\n", "utf-8");
}
