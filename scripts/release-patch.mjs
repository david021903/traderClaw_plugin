#!/usr/bin/env node
/**
 * One-shot patch release for the plugin + synced cli/package.json:
 *   npm version patch → sync-cli-version → git commit cli (if changed)
 *
 * Requires clean git status (same as npm version).
 * After this: npm publish (root), cd cli && npm publish, git push --follow-tags
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

execSync("npm version patch", { cwd: root, stdio: "inherit", shell: true });
execSync("npm run sync-cli", { cwd: root, stdio: "inherit", shell: true });

const ver = JSON.parse(readFileSync(join(root, "package.json"), "utf-8")).version;
const dirty = execSync("git status --porcelain cli/package.json", {
  cwd: root,
  encoding: "utf-8",
}).trim();

if (dirty) {
  execSync("git add cli/package.json", { cwd: root, stdio: "inherit" });
  execSync(`git commit -m ${JSON.stringify(`chore(cli): sync to plugin ${ver}`)}`, {
    cwd: root,
    stdio: "inherit",
  });
} else {
  console.log("release-patch: cli/package.json already matched, no second commit");
}

console.log("");
console.log("Next:");
console.log("  npm publish --access public");
console.log("  cd cli && npm publish --access public");
console.log("  git push origin main --follow-tags");
