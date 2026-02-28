#!/usr/bin/env node

import { execSync } from "node:child_process";

const RED_ZONE_PREFIXES = [
  "apps/api/src/api/v1/inbox.py",
  "apps/api/src/services/capture_pipeline.py",
  "apps/api/src/sync/",
  "apps/api/src/api/v1/capture_external.py",
  "packages/shared/src/inbox.ts",
  "packages/shared/src/sync.ts",
  "apps/web/src/hooks/use-inbox.ts",
  "apps/web/src/hooks/use-sync.ts",
  "apps/mobile/hooks/use-inbox.ts",
];

function readChangedFiles(stagedOnly) {
  const command = stagedOnly
    ? "git diff --name-only --cached"
    : "git diff --name-only";
  const output = execSync(command, { encoding: "utf8" }).trim();
  if (!output) return [];
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function isRedZoneFile(pathname) {
  return RED_ZONE_PREFIXES.some((prefix) => {
    if (prefix.endsWith("/")) return pathname.startsWith(prefix);
    return pathname === prefix;
  });
}

function main() {
  const stagedOnly = !process.argv.includes("--all");
  const changed = readChangedFiles(stagedOnly);
  const blocked = changed.filter(isRedZoneFile);

  if (blocked.length === 0) {
    console.log("lane boundary check: ok");
    process.exit(0);
  }

  console.error("lane boundary check: blocked (red-zone files detected)");
  for (const file of blocked) {
    console.error(` - ${file}`);
  }
  console.error("");
  console.error(
    "This lane must avoid Sync/Capture/Inbox hot files. Move those edits to a dedicated integration window."
  );
  process.exit(1);
}

main();
