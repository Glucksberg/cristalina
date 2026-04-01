import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { runCristalinaCli, cristalinaHelpText } from "./runner.js";

export { runCristalinaCli, cristalinaHelpText } from "./runner.js";

const isDirectExecution = process.argv[1] !== undefined
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const exitCode = await runCristalinaCli(process.argv.slice(2));
  process.exit(exitCode);
}
