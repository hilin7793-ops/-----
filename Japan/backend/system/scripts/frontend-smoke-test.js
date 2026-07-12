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
  assert.match(html, /auth-policy-production-safe/);
  assert.match(html, /首頁整體刷新/);
  assert.match(html, /管理 \+ 回顧/);
  assert.match(html, /商店與拍賣/);

  console.log("frontend-smoke-test passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
