import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

async function main() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const rulesPath = resolve(scriptDir, "../../../design/rules.md");
  const functionPath = resolve(scriptDir, "../../../design/function.md");
  const statusPath = resolve(scriptDir, "../../../design/backend-status.md");

  const [rules, functionDoc, statusDoc] = await Promise.all([
    readFile(rulesPath, "utf8"),
    readFile(functionPath, "utf8"),
    readFile(statusPath, "utf8"),
  ]);

  assert.match(rules, /14\.1\.4/);
  assert.match(rules, /16\.17/);
  assert.match(functionDoc, /calculateAuctionTicketRating/);
  assert.match(functionDoc, /executeBlindBoxEffect/);
  assert.match(functionDoc, /submitTrafficIncidentRequest/);
  assert.match(functionDoc, /approveTrafficIncidentRequest/);
  assert.match(statusDoc, /rules\.md/);
  assert.match(statusDoc, /function\.md/);

  console.log("design-smoke-test passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
