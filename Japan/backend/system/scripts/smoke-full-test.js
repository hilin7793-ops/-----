import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptList = [
  "api-smoke-test.js",
  "access-control-smoke-test.js",
  "visibility-smoke-test.js",
  "service-rules-smoke-test.js",
  "unit-smoke-test.js",
  "design-smoke-test.js",
  "pocketbase-auth-smoke-test.js",
  "pocketbase-flow-smoke-test.js",
  "frontend-smoke-test.js",
];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(scriptDir, scriptName)], {
      cwd: scriptDir,
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${scriptName} exited with code ${code}`));
    });
  });
}

async function main() {
  for (const scriptName of scriptList) {
    await runScript(scriptName);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
