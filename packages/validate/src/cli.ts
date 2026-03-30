#!/usr/bin/env node

import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { lintStore } from "./store/linter.js";
import { formatDiagnostic } from "./diagnostics.js";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    json: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

const command = positionals[0];
const target = positionals[1];

if (values.help || !command) {
  console.log(`Usage: cristalina-validate <command> <path> [options]

Commands:
  lint <path>       Lint a .cristalina/ store directory

Options:
  --json            Output results as JSON
  -h, --help        Show this help message

Examples:
  cristalina-validate lint .cristalina/
  cristalina-validate lint examples/sample-store/.cristalina/ --json`);
  process.exit(command ? 0 : 1);
}

if (command === "lint") {
  if (!target) {
    console.error("Error: lint requires a path to a .cristalina/ store directory");
    process.exit(1);
  }

  const storePath = resolve(target);

  try {
    const result = await lintStore(storePath);

    if (values.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\nCristalina Store Lint`);
      console.log(`  Path:    ${storePath}`);
      console.log(`  Files:   ${result.fileCount}`);
      console.log(`  Objects: ${result.objectCount}`);
      console.log();

      if (result.diagnostics.length === 0) {
        console.log("  No issues found.");
      } else {
        for (const d of result.diagnostics) {
          console.log(`  ${formatDiagnostic(d)}`);
        }
        console.log();
        console.log(
          `  ${result.errorCount} error(s), ${result.warningCount} warning(s), ${result.infoCount} info(s)`,
        );
      }
      console.log();
    }

    process.exit(result.errorCount > 0 ? 1 : 0);
  } catch (err) {
    console.error(`Error: ${(err as Error).message}`);
    process.exit(2);
  }
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
}
