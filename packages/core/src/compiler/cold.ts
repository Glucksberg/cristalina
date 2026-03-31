import type { ScoredObject } from "./scoring.js";
import { stringify as yamlStringify } from "yaml";

/** Render COLD tier: index of archived/low-relevance objects */
export function renderCold(objects: ScoredObject[]): string {
  const index = objects.map(({ object, score }) => ({
    id: object.data.id,
    kind: object.data.kind,
    statement: typeof object.data.statement === "string" ? object.data.statement.slice(0, 100) : undefined,
    score,
    file: object.file,
  }));

  return yamlStringify({ cold_index: index }, { lineWidth: 120 });
}
