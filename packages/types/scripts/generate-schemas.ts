import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  EventSchema,
  ProposalSchema,
  MemoryObjectSchema,
  RelationshipSchema,
  ValueSchema,
  IdentityTraitSchema,
  StyleRuleSchema,
  ContradictionSchema,
  QuestionSchema,
  ResponseSchema,
  DerivedArtifactSchema,
  AdapterWritebackContractSchema,
  CurationPacketSchema,
  ProjectionManifestSchema,
  ManifestSchema,
} from "../src/index.js";

const BASE_URI = "https://cristalina.dev/schemas";

const schemas = [
  { name: "event", schema: EventSchema, title: "Cristalina Event" },
  { name: "proposal", schema: ProposalSchema, title: "Cristalina Proposal" },
  { name: "memory-object", schema: MemoryObjectSchema, title: "Cristalina Canonical Memory Object" },
  { name: "relationship", schema: RelationshipSchema, title: "Cristalina Relationship" },
  { name: "value", schema: ValueSchema, title: "Cristalina Value" },
  { name: "identity-trait", schema: IdentityTraitSchema, title: "Cristalina Identity Trait" },
  { name: "style-rule", schema: StyleRuleSchema, title: "Cristalina Style Rule" },
  { name: "contradiction", schema: ContradictionSchema, title: "Cristalina Contradiction" },
  { name: "question", schema: QuestionSchema, title: "Cristalina Question" },
  { name: "response", schema: ResponseSchema, title: "Cristalina Response" },
  { name: "derived-artifact", schema: DerivedArtifactSchema, title: "Cristalina Derived Artifact" },
  { name: "adapter-writeback-contract", schema: AdapterWritebackContractSchema, title: "Cristalina Adapter Writeback Contract" },
  { name: "curation-packet", schema: CurationPacketSchema, title: "Cristalina Curation Packet" },
  { name: "projection-manifest", schema: ProjectionManifestSchema, title: "Cristalina Projection Manifest" },
  { name: "manifest", schema: ManifestSchema, title: "Cristalina Manifest" },
];

const outDir = resolve(import.meta.dirname, "../../../schemas");
mkdirSync(outDir, { recursive: true });

for (const { name, schema, title } of schemas) {
  const jsonSchema = zodToJsonSchema(schema, {
    name: title,
    $refStrategy: "none",
  });

  const output = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `${BASE_URI}/${name}.schema.json`,
    ...jsonSchema.definitions?.[title] ?? jsonSchema,
    title,
  };

  // Remove the wrapper if zodToJsonSchema produced one
  delete (output as Record<string, unknown>)["definitions"];
  delete (output as Record<string, unknown>)["$ref"];

  const filePath = resolve(outDir, `${name}.schema.json`);
  writeFileSync(filePath, JSON.stringify(output, null, 2) + "\n");
  console.log(`  wrote ${name}.schema.json`);
}

console.log(`\nGenerated ${schemas.length} schemas in ${outDir}`);
