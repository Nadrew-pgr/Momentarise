#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const webEnvPath = resolve(root, "apps/web/.env.local");
const mobileEnvPath = resolve(root, "apps/mobile/.env");

function readEnvValue(path, key) {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf8");
  const line = raw
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${key}=`));
  if (!line) return null;
  return line.slice(key.length + 1).trim();
}

function runCmd(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch {
    return null;
  }
}

function printSection(title) {
  console.log(`\n[${title}]`);
}

let hasIssue = false;

printSection("Sync runtime endpoints");
const webApi = readEnvValue(webEnvPath, "API_URL");
const mobileApi = readEnvValue(mobileEnvPath, "EXPO_PUBLIC_API_URL");
console.log(`web API_URL: ${webApi ?? "(missing)"}`);
console.log(`mobile EXPO_PUBLIC_API_URL: ${mobileApi ?? "(missing)"}`);
if (!webApi || !mobileApi) {
  hasIssue = true;
  console.log("issue: missing API URL in web or mobile env");
}

printSection("Port 8000 listeners");
const lsofRaw = runCmd("lsof -nP -iTCP:8000 -sTCP:LISTEN");
if (!lsofRaw) {
  hasIssue = true;
  console.log("issue: unable to inspect port 8000 listeners (lsof failed)");
} else {
  const lines = lsofRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  lines.forEach((line) => console.log(line));
  const listenerLines = lines.slice(1);
  if (listenerLines.length > 1) {
    hasIssue = true;
    console.log("issue: multiple listeners detected on port 8000 (possible split-brain)");
  }
  if (listenerLines.length === 0) {
    hasIssue = true;
    console.log("issue: no listener on port 8000");
  }
}

printSection("Docker API container");
const dockerRaw = runCmd("docker ps --format '{{.Names}}\\t{{.Ports}}'");
if (dockerRaw) {
  const rows = dockerRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const apiRows = rows.filter((row) => row.includes("momentarise-api"));
  if (apiRows.length === 0) {
    console.log("info: no momentarise-api container running");
  } else {
    apiRows.forEach((row) => console.log(row));
  }
} else {
  console.log("info: docker unavailable or not running");
}

console.log("");
if (hasIssue) {
  console.log("Sync doctor: FAILED");
  process.exit(1);
}
console.log("Sync doctor: OK");
