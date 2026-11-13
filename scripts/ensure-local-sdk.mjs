import { cpSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(fileURLToPath(import.meta.url));
const storefrontRoot = resolve(root, "..");
const sdkPath = resolve(storefrontRoot, "..", "packages", "sdk");

if (!existsSync(resolve(sdkPath, "package.json"))) {
  console.log("ensure-local-sdk: no monorepo SDK path; skipping");
  process.exit(0);
}

const result = spawnSync("pnpm", ["build"], {
  cwd: sdkPath,
  stdio: "inherit",
  shell: true,
});

if (result.status !== 0) process.exit(result.status ?? 1);

// `file:` dependencies are copied into pnpm's virtual store on install. Keep
// the running storefront's SDK copy aligned with the just-built workspace SDK
// so new API fields are not dropped by stale runtime schemas.
const sourceDist = resolve(sdkPath, "dist");
const installedDist = resolve(storefrontRoot, "node_modules", "@spree", "sdk", "dist");

if (existsSync(sourceDist) && existsSync(installedDist)) {
  cpSync(sourceDist, installedDist, { recursive: true });
}
