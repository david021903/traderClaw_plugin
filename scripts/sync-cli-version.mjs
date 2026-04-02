#!/usr/bin/env node
/**
 * Sets cli/package.json "version" and dependencies.solana-traderclaw to match
 * the root package.json version (semver range ^x.y.z on the plugin).
 *
 * Run from repo root after `npm version patch` (or any version bump).
 */
import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const rootPkg = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf-8"));
const ver = typeof rootPkg.version === "string" ? rootPkg.version.trim() : "";
if (!/^\d+\.\d+\.\d+/.test(ver)) {
  console.error("sync-cli-version: invalid root package.json version:", rootPkg.version);
  process.exit(1);
}

const cliPath = join(rootDir, "cli", "package.json");
const cliPkg = JSON.parse(readFileSync(cliPath, "utf-8"));

cliPkg.version = ver;
cliPkg.dependencies = cliPkg.dependencies || {};
cliPkg.dependencies["solana-traderclaw"] = `^${ver}`;

writeFileSync(cliPath, JSON.stringify(cliPkg, null, 2) + "\n", "utf-8");
console.log(`sync-cli-version: cli/package.json → version ${ver}, solana-traderclaw ^${ver}`);
