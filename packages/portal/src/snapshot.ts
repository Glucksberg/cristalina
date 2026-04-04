import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateBootstrap } from "@cristalina/core";
import type { PrivacyScope, ProjectionProfile } from "@cristalina/types";
import {
  lintStore,
  readStore,
  type ParsedObject,
  type ParsedStore,
} from "@cristalina/validate";

export interface PortalItem {
  id: string;
  kind: string;
  statement: string;
  status?: string;
  confidence?: number;
  file: string;
  timestamp?: string;
}

export interface PortalDiagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  file?: string;
  objectId?: string;
  path?: string;
}

export interface PortalFileCard {
  id: string;
  title: string;
  path: string;
  category: "canonical" | "events" | "proposals" | "policy" | "projection" | "registry";
  description: string;
  present: boolean;
  objectCount: number;
  excerpts: string[];
}

export interface PortalProjectionCard {
  id: "soul" | "value" | "user" | "memory";
  title: "SOUL.md" | "VALUE.md" | "USER.md" | "MEMORY.md";
  description: string;
  excerpt: string[];
  lineCount: number;
}

export interface PortalDomainCard {
  id: string;
  title: string;
  count: number;
  description: string;
}

export interface PortalSnapshot {
  generatedAt: string;
  storePath: string;
  audience: PrivacyScope;
  profile: ProjectionProfile;
  manifest: {
    name: string;
    displayName: string;
    protocolVersion: string;
    repositoryVersion: string;
    status: string;
  };
  health: {
    status: "healthy" | "warning" | "error";
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  counts: {
    events: number;
    proposals: number;
    curationPackets: number;
    coreObjects: number;
    entities: number;
    policyObjects: number;
    contradictions: number;
    files: number;
  };
  domains: PortalDomainCard[];
  fileAtlas: PortalFileCard[];
  projections: PortalProjectionCard[];
  recent: {
    events: PortalItem[];
    proposals: PortalItem[];
    canonical: PortalItem[];
  };
  diagnostics: PortalDiagnostic[];
}

interface FileDefinition {
  id: string;
  title: string;
  path: string;
  category: PortalFileCard["category"];
  description: string;
  computedExcerpts?: (args: SnapshotContext) => string[];
}

interface SnapshotContext {
  store: ParsedStore;
  byFile: Map<string, ParsedObject[]>;
  bootstrap: ReturnType<typeof generateBootstrap>;
}

const FILE_DEFINITIONS: readonly FileDefinition[] = [
  {
    id: "manifest",
    title: "manifest.yaml",
    path: "manifest.yaml",
    category: "registry",
    description: "Identidade do store, versão do protocolo e ponte para docs e schemas.",
    computedExcerpts: ({ store }) => {
      if (!store.manifest) return [];
      return compactStrings([
        `name: ${stringValue(store.manifest.name)}`,
        `display_name: ${stringValue(store.manifest.display_name)}`,
        `protocol_version: ${stringValue(store.manifest.protocol_version)}`,
        `repository_version: ${stringValue(store.manifest.repository_version)}`,
      ]);
    },
  },
  {
    id: "entities",
    title: "entities/registry.yaml",
    path: "entities/registry.yaml",
    category: "registry",
    description: "Registro estável das entidades: owner, agente, runtimes e outros atores duráveis.",
  },
  {
    id: "audience-policy",
    title: "policy/audience.yaml",
    path: "policy/audience.yaml",
    category: "policy",
    description: "Matriz de audiência e privacidade. Define quem pode ver o quê.",
  },
  {
    id: "authority-policy",
    title: "policy/authority.yaml",
    path: "policy/authority.yaml",
    category: "policy",
    description: "Restrições de autoridade sobre quais classes exigem ratificação humana.",
  },
  {
    id: "projection-policy",
    title: "policy/projection.yaml",
    path: "policy/projection.yaml",
    category: "policy",
    description: "Regras de HOT/WARM/COLD e perfis de projeção para runtimes.",
  },
  {
    id: "promotion-policy",
    title: "policy/promotion.yaml",
    path: "policy/promotion.yaml",
    category: "policy",
    description: "Política de promoção e curadoria: o que vira pergunta, revisão ou bloqueio.",
  },
  {
    id: "identity-soul",
    title: "core/identity/soul.yaml",
    path: "core/identity/soul.yaml",
    category: "canonical",
    description: "Traços identitários duráveis do agente. Não é runtime livre; é memória governada.",
  },
  {
    id: "identity-style",
    title: "core/identity/style.yaml",
    path: "core/identity/style.yaml",
    category: "canonical",
    description: "Regras de estilo e postura operacional persistentes.",
  },
  {
    id: "ratified-facts",
    title: "core/ratified/facts.yaml",
    path: "core/ratified/facts.yaml",
    category: "canonical",
    description: "Fatos, preferências e constraints ratificados que sustentam a memória semântica.",
  },
  {
    id: "values",
    title: "core/values/values.yaml",
    path: "core/values/values.yaml",
    category: "canonical",
    description: "Valores e prioridades que orientam escolhas do sistema.",
  },
  {
    id: "events",
    title: "events/",
    path: "events/",
    category: "events",
    description: "Registro bruto append-only do que ocorreu. Eventos são baratos; verdade é cara.",
    computedExcerpts: ({ store }) => store.events
      .slice(-3)
      .reverse()
      .map((event) => stringValue(event.data.summary))
      .filter(Boolean),
  },
  {
    id: "proposals",
    title: "proposals/",
    path: "proposals/",
    category: "proposals",
    description: "Mudanças candidatas que ainda precisam de governança e ratificação.",
    computedExcerpts: ({ store }) => store.proposals
      .slice(-3)
      .reverse()
      .map((proposal) => stringValue((proposal.data.candidate_payload as Record<string, unknown> | undefined)?.statement) || stringValue(proposal.data.reason))
      .filter(Boolean),
  },
  {
    id: "bootstrap-soul",
    title: "SOUL.md",
    path: "compiled/bootstrap/SOUL.md",
    category: "projection",
    description: "Projeção viva da identidade do agente para o runtime.",
    computedExcerpts: ({ bootstrap }) => markdownExcerpt(bootstrap.soul),
  },
  {
    id: "bootstrap-value",
    title: "VALUE.md",
    path: "compiled/bootstrap/VALUE.md",
    category: "projection",
    description: "Projeção viva dos valores e prioridades para o runtime.",
    computedExcerpts: ({ bootstrap }) => markdownExcerpt(bootstrap.value),
  },
  {
    id: "bootstrap-user",
    title: "USER.md",
    path: "compiled/bootstrap/USER.md",
    category: "projection",
    description: "Projeção viva do modelo do usuário e das preferências de interação do runtime.",
    computedExcerpts: ({ bootstrap }) => markdownExcerpt(bootstrap.user),
  },
  {
    id: "bootstrap-memory",
    title: "MEMORY.md",
    path: "compiled/bootstrap/MEMORY.md",
    category: "projection",
    description: "Projeção viva do working set, dos projetos ativos e dos loops abertos do runtime.",
    computedExcerpts: ({ bootstrap }) => markdownExcerpt(bootstrap.memory),
  },
];

export async function buildPortalSnapshot(args: {
  storePath: string;
  audience?: PrivacyScope;
  profile?: ProjectionProfile;
}): Promise<PortalSnapshot> {
  const audience = args.audience ?? "owner_private";
  const profile = args.profile ?? "deep";
  const store = await readStore(args.storePath);
  const lint = await lintStore(args.storePath);
  const bootstrap = generateBootstrap(store.coreObjects, store.contradictions, audience, profile);
  const byFile = groupByFile(store);
  const context: SnapshotContext = { store, byFile, bootstrap };

  return {
    generatedAt: new Date().toISOString(),
    storePath: store.root,
    audience,
    profile,
    manifest: {
      name: stringValue(store.manifest?.name) || "unnamed-store",
      displayName: stringValue(store.manifest?.display_name) || stringValue(store.manifest?.name) || "Cristalina Store",
      protocolVersion: stringValue(store.manifest?.protocol_version) || "unknown",
      repositoryVersion: stringValue(store.manifest?.repository_version) || "unknown",
      status: stringValue(store.manifest?.status) || "unknown",
    },
    health: {
      status: lint.errorCount > 0 ? "error" : lint.warningCount > 0 ? "warning" : "healthy",
      errorCount: lint.errorCount,
      warningCount: lint.warningCount,
      infoCount: lint.infoCount,
    },
    counts: {
      events: store.events.length,
      proposals: store.proposals.length,
      curationPackets: store.curationPackets.length,
      coreObjects: store.coreObjects.length,
      entities: store.entities.length,
      policyObjects: store.policyObjects.length,
      contradictions: store.contradictions.length,
      files: store.files.length,
    },
    domains: [
      {
        id: "events",
        title: "Events",
        count: store.events.length,
        description: "Registro bruto e append-only.",
      },
      {
        id: "proposals",
        title: "Proposals",
        count: store.proposals.length + store.curationPackets.length,
        description: "Mudanças candidatas e pacotes de curadoria.",
      },
      {
        id: "core",
        title: "Canonical Core",
        count: store.coreObjects.length,
        description: "Memória ratificada e governada.",
      },
      {
        id: "entities",
        title: "Entities",
        count: store.entities.length,
        description: "Atores duráveis do sistema.",
      },
      {
        id: "policy",
        title: "Policy",
        count: store.policyObjects.length,
        description: "Leis operacionais e de privacidade.",
      },
      {
        id: "compiled",
        title: "Projection",
        count: 4,
        description: "Arquivos derivados para runtime.",
      },
    ],
    fileAtlas: FILE_DEFINITIONS.map((definition) => buildFileCard(definition, context)),
    projections: [
      buildProjectionCard("soul", "SOUL.md", "Identidade e traços estáveis do agente.", bootstrap.soul),
      buildProjectionCard("value", "VALUE.md", "Prioridades e guardrails persistentes.", bootstrap.value),
      buildProjectionCard("user", "USER.md", "Contexto do usuário e preferências que guiam a interação.", bootstrap.user),
      buildProjectionCard("memory", "MEMORY.md", "Resumo operativo da memória quente do sistema.", bootstrap.memory),
    ],
    recent: {
      events: recentItems(store.events, 6, (event) => stringValue(event.data.ts)),
      proposals: recentItems(store.proposals, 6, (proposal) => stringValue(proposal.data.created_at)),
      canonical: recentItems(store.coreObjects, 6, (object) => stringValue(object.data.last_confirmed_at) || stringValue(object.data.created_at)),
    },
    diagnostics: lint.diagnostics.slice(0, 20).map((diagnostic) => ({
      severity: diagnostic.severity,
      code: diagnostic.rule,
      message: diagnostic.message,
      file: diagnostic.file,
      objectId: diagnostic.objectId,
      path: diagnostic.path,
    })),
  };
}

function buildFileCard(definition: FileDefinition, context: SnapshotContext): PortalFileCard {
  const present = definition.path.endsWith("/")
    ? context.store.files.some((file) => file.startsWith(definition.path))
    : context.store.files.includes(definition.path);
  const objectCount = definition.path.endsWith("/")
    ? countObjectsInDirectory(definition.path, context.byFile)
    : (context.byFile.get(definition.path)?.length ?? 0);
  const excerpts = definition.computedExcerpts
    ? definition.computedExcerpts(context)
    : previewForPath(definition.path, context.byFile, context.store.root);

  return {
    id: definition.id,
    title: definition.title,
    path: definition.path,
    category: definition.category,
    description: definition.description,
    present,
    objectCount,
    excerpts: excerpts.slice(0, 4),
  };
}

function buildProjectionCard(
  id: PortalProjectionCard["id"],
  title: PortalProjectionCard["title"],
  description: string,
  markdown: string,
): PortalProjectionCard {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  return {
    id,
    title,
    description,
    excerpt: lines.slice(0, 6),
    lineCount: markdown.split("\n").length,
  };
}

function groupByFile(store: ParsedStore): Map<string, ParsedObject[]> {
  const grouped = new Map<string, ParsedObject[]>();
  for (const collection of [
    store.events,
    store.proposals,
    store.curationPackets,
    store.coreObjects,
    store.entities,
    store.policyObjects,
    store.contradictions,
  ]) {
    for (const object of collection) {
      if (!grouped.has(object.file)) grouped.set(object.file, []);
      grouped.get(object.file)!.push(object);
    }
  }
  return grouped;
}

function countObjectsInDirectory(directory: string, byFile: Map<string, ParsedObject[]>): number {
  let count = 0;
  for (const [file, objects] of byFile.entries()) {
    if (!file.startsWith(directory)) continue;
    count += objects.length;
  }
  return count;
}

function previewForPath(path: string, byFile: Map<string, ParsedObject[]>, root: string): string[] {
  const objects = byFile.get(path);
  if (objects && objects.length > 0) {
    return objects
      .map((object) => objectSummary(object))
      .filter(Boolean)
      .slice(0, 4);
  }

  const fullPath = resolve(root, path);
  if (!existsSync(fullPath)) return [];
  const lines = readFileSync(fullPath, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
  return lines.slice(0, 4);
}

function recentItems(
  objects: ParsedObject[],
  limit: number,
  timestamp: (object: ParsedObject) => string,
): PortalItem[] {
  return [...objects]
    .sort((a, b) => compareTimestamp(timestamp(b), timestamp(a)))
    .slice(0, limit)
    .map((object) => ({
      id: stringValue(object.data.id) || stringValue(object.data.packet_id) || "unknown",
      kind: stringValue(object.data.kind) || "unknown",
      statement: objectSummary(object) || "No summary available.",
      status: stringValue(object.data.status),
      confidence: typeof object.data.confidence === "number" ? object.data.confidence : undefined,
      file: object.file,
      timestamp: timestamp(object) || undefined,
    }));
}

function compareTimestamp(left: string, right: string): number {
  const leftMs = Date.parse(left);
  const rightMs = Date.parse(right);
  if (Number.isNaN(leftMs) && Number.isNaN(rightMs)) return 0;
  if (Number.isNaN(leftMs)) return -1;
  if (Number.isNaN(rightMs)) return 1;
  return leftMs - rightMs;
}

function objectSummary(object: ParsedObject): string {
  return compactStrings([
    stringValue(object.data.statement),
    stringValue(object.data.summary),
    stringValue(object.data.reason),
    stringValue(object.data.question),
    stringValue(object.data.name),
  ])[0] ?? "";
}

function markdownExcerpt(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .slice(0, 4);
}

function compactStrings(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value && value.trim().length > 0));
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
