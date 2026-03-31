// Store
export { CristalinaStore, type StoreOptions } from "./store/store.js";

// Operations
export {
  type OperationInput, type OperationResult, type StoreEffect,
  type PlanResult, type AuditEntry,
  type LogInput, type ProposeInput, type ConfirmInput, type ReviseInput,
  type ExtendInput, type ContradictInput, type SupersedeInput,
  type DeprecateInput, type CrystallizeInput, type ArchiveInput,
} from "./operations/types.js";
export { executeOperation, planOperation, applyEffects } from "./operations/index.js";

// Promotion
export { generateCurationPacket, type GeneratedPacket } from "./promotion/curation.js";
export { applyRatification, type RatificationInput, type RatificationResult, type CurationResponse } from "./promotion/ratification.js";
export { type PromotionPolicy, DEFAULT_POLICY, requiresHumanApproval } from "./promotion/policy.js";

// Compiler
export { compile, type CompilationOptions, type CompiledContext } from "./compiler/index.js";
export { generateBootstrap, type BootstrapFiles } from "./compiler/bootstrap.js";

// Audit
export { AuditLogger } from "./audit/logger.js";
export { computeDiff, formatDiffSummary } from "./audit/diff.js";
export { createSnapshot, restoreSnapshot, type SnapshotManifest } from "./audit/rollback.js";

// Utilities
export { type Clock, SystemClock, FixedClock } from "./clock/clock.js";
export { type IdGenerator, DefaultIdGenerator, DeterministicIdGenerator } from "./id/generator.js";
