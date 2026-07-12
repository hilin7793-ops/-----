import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

async function main() {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const frontendPath = resolve(scriptDir, "../../../frontend/index.html");
  const html = await readFile(frontendPath, "utf8");

  assert.match(html, /loadAuthAndAccess\(\)/);
  assert.match(html, /loadShopAndAuction\(\)/);
  assert.match(html, /loadManagementAndVisibility\(\)/);
  assert.match(html, /loadCoreConsole\(\)/);
  assert.match(html, /await loadCoreConsole\(\)/);
  assert.match(html, /refreshDashboard\(\)/);
  assert.match(html, /Production: 未載入/);
  assert.match(html, /Production: \$\{state\.authSession\?\.authPolicy\?\.productionSafe \? "Safe" : "Review"\}/);
  assert.match(html, /auth-policy-production-safe/);
  assert.match(html, /auth-bearer-token/);
  assert.match(html, /japan\.bearerToken/);
  assert.match(html, /saveBearerTokenFromConsole\(\)/);
  assert.match(html, /clearBearerTokenFromConsole\(\)/);
  assert.match(html, /games\/\$\{gameId\}\/checklist\/process/);
  assert.match(html, /games\/\$\{gameId\}\/journeys\/cancel-batch/);
  assert.match(html, /games\/\$\{gameId\}\/journeys\/lock-batch/);
  assert.match(html, /games\/\$\{gameId\}\/journeys\/unlock-batch/);
  assert.match(html, /games\/\$\{gameId\}\/traffic-incidents\/review-batch/);
  assert.match(html, /首頁整體刷新/);
  assert.match(html, /管理 \+ 回顧/);
  assert.match(html, /商店與拍賣/);

  console.log("frontend-smoke-test passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
