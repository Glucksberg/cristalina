import { existsSync, readdirSync, statSync } from "node:fs";

export type PathState = "missing" | "file" | "directory-empty" | "directory-nonempty";

export function getPathState(path: string): PathState {
  if (!existsSync(path)) return "missing";
  const stat = statSync(path);
  if (!stat.isDirectory()) return "file";
  return readdirSync(path).length > 0 ? "directory-nonempty" : "directory-empty";
}

export function directoryHasEntries(path: string): boolean {
  return getPathState(path) === "directory-nonempty";
}
