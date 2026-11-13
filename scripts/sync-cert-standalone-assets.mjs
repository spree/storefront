import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const distDir = process.env.SPREE_NEXT_DIST_DIR || ".next-storefront-cert";
const root = process.cwd();
const distRoot = join(root, distDir);
const standaloneRoot = join(distRoot, "standalone");
const staticSrc = join(distRoot, "static");
const staticDest = join(standaloneRoot, distDir, "static");
const publicSrc = join(root, "public");
const publicDest = join(standaloneRoot, "public");

if (!existsSync(join(standaloneRoot, "server.js"))) {
  throw new Error(
    `${join(standaloneRoot, "server.js")} missing — run the cert production build first`,
  );
}
if (!existsSync(staticSrc)) {
  throw new Error(`${staticSrc} missing — run the cert production build first`);
}
cpSync(staticSrc, staticDest, { recursive: true, force: true });
cpSync(publicSrc, publicDest, { recursive: true, force: true });
console.log(`Synced static -> ${staticDest}`);
console.log(`Synced public -> ${publicDest}`);