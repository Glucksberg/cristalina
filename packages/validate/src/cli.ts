#!/usr/bin/env node

import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { lintStore } from "./store/linter.js";
import { formatDiagnostic } from "./diagnostics.js";

export interface CliIo {
  log: (message: string) => void;
  error: (message: string) => void;
}

export function validateHelpText(): string {
  return `Usage: cristalina-validate <command> <path> [options]

Commands:
  lint <path>       Lint a .cristalina/ store directory

Options:
  --json            Output results as JSON
  -h, --help        Show this help message

Examples:
  cristalina-validate lint .cristalina/
  cristalina-validate lint examples/sample-store/.cristalina/ --json`;
}

export async function runValidateCli(
  argv: string[],
  io: CliIo = { log: console.log, error: console.error },
): Promise<number> {
  const { positionals, values } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      json: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  const command = positionals[0];
  const target = positionals[1];

  if (values.help || !command) {
    io.log(validateHelpText());
    return command ? 0 : 1;
  }

  if (command === "lint") {
    if (!target) {
      io.error("Error: lint requires a path to a .cristalina/ store directory");
      return 1;
    }

    const storePath = resolve(target);

    try {
      const result = await lintStore(storePath);

      if (values.json) {
        io.log(JSON.stringify(result, null, 2));
      } else {
        io.log(`\nCristalina Store Lint`);
        io.log(`  Path:    ${storePath}`);
        io.log(`  Files:   ${result.fileCount}`);
        io.log(`  Objects: ${result.objectCount}`);
        io.log("");

        if (result.diagnostics.length === 0) {
          io.log("  No issues found.");
        } else {
          for (const d of result.diagnostics) {
            io.log(`  ${formatDiagnostic(d)}`);
          }
          io.log("");
          io.log(
            `  ${result.errorCount} error(s), ${result.warningCount} warning(s), ${result.infoCount} info(s)`,
          );
        }
        io.log("");
      }

      return result.errorCount > 0 ? 1 : 0;
    } catch (err) {
      io.error(`Error: ${(err as Error).message}`);
      return 2;
    }
  }

  io.error(`Unknown command: ${command}`);
  return 1;
}

const isDirectExecution = process.argv[1] !== undefined
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const exitCode = await runValidateCli(process.argv.slice(2));
  process.exit(exitCode);
}
