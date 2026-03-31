import type { CristalinaStore } from "../store/store.js";
import type { OperationResult } from "../operations/types.js";
import { executeOperation } from "../operations/index.js";

export interface CurationResponse {
  question_ref: string;
  answer_type: "accept" | "reject" | "edit" | "defer" | "uncertain";
  answer_text: string;
}

export interface RatificationInput {
  responses: CurationResponse[];
  /** Map question_ref -> proposal ID to apply the response to */
  questionToProposal: Map<string, string>;
  /** Map question_ref -> target object ID (for CONFIRM/REVISE) */
  questionToTarget: Map<string, string>;
  /** File path where proposals are stored (for status updates) */
  proposalFilePath?: string;
}

export interface RatificationResult {
  applied: OperationResult[];
  skipped: string[];
}

/**
 * Apply owner responses from a curation packet.
 * Each response dispatches to the appropriate operation.
 */
export async function applyRatification(
  store: CristalinaStore,
  input: RatificationInput,
): Promise<RatificationResult> {
  const applied: OperationResult[] = [];
  const skipped: string[] = [];

  for (const response of input.responses) {
    const proposalId = input.questionToProposal.get(response.question_ref);
    const targetId = input.questionToTarget.get(response.question_ref);

    if (!proposalId) {
      skipped.push(response.question_ref);
      continue;
    }

    switch (response.answer_type) {
      case "accept": {
        if (targetId) {
          // Confirm the existing target
          const result = await executeOperation(store, {
            op: "CONFIRM",
            targetId,
            confirmedBy: "owner",
            authorized: true,
          });
          applied.push(result);
        }
        break;
      }

      case "edit": {
        if (targetId) {
          // Revise the existing target with the human's edited text
          const result = await executeOperation(store, {
            op: "REVISE",
            targetId,
            newStatement: response.answer_text,
            reason: "Human edited via curation",
            source_type: "human_reply",
            source_ref: `curation/${response.question_ref}`,
            confirmedBy: "owner",
            authorized: true,
          });
          applied.push(result);
        }
        break;
      }

      case "reject": {
        // Log the rejection as an event
        const result = await executeOperation(store, {
          op: "LOG",
          kind: "ratification_applied",
          summary: `Rejected proposal ${proposalId}: ${response.answer_text}`,
          source_type: "human_reply",
          privacy_scope: "owner_private",
          actor: "owner",
        });
        applied.push(result);
        break;
      }

      case "defer":
      case "uncertain": {
        // Log but don't change canonical state
        const result = await executeOperation(store, {
          op: "LOG",
          kind: "ratification_applied",
          summary: `${response.answer_type === "defer" ? "Deferred" : "Uncertain"} on proposal ${proposalId}`,
          source_type: "human_reply",
          privacy_scope: "owner_private",
          actor: "owner",
        });
        applied.push(result);
        break;
      }
    }

    // Update proposal status if we know the file path
    if (input.proposalFilePath && proposalId) {
      const statusMap: Record<string, string> = {
        accept: "approved",
        reject: "rejected",
        edit: "approved",
        defer: "deferred",
        uncertain: "pending",
      };
      const newStatus = statusMap[response.answer_type];
      if (newStatus) {
        store.updateYamlItem(input.proposalFilePath, proposalId, { status: newStatus });
      }
    }
  }

  return { applied, skipped };
}
