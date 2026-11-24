#!/usr/bin/env node
// CLI: node scripts/plan-strict.mjs [status|strict|soft]
// 直接做磁盘手术并写期望态；宿主下次启动时 selfHeal 会核对。
import { detectAiBase, detectPurgeEnvironment, readStateFile, writeStateFile } from "../lib/detect.js";
import { targetFiles } from "../lib/snapshots.js";
import { detectState, surgery } from "../lib/strict-core.js";
import fs from "node:fs";

const cmd = process.argv[2] || "status";
const aiBase = detectAiBase();
const env = detectPurgeEnvironment(aiBase);

if (cmd === "status") {
  const state = readStateFile();
  const rows = aiBase ? targetFiles(aiBase).map((f) => {
    try { return { file: f.split("/").pop(), ...detectState(fs.readFileSync(f, "utf8")) }; }
    catch { return { file: f.split("/").pop(), state: "missing" }; }
  }) : [];
  console.log(JSON.stringify({ aiBase, env, expected: state, files: rows }, null, 2));
  process.exit(0);
}

if (cmd !== "strict" && cmd !== "soft") {
  console.error("usage: plan-strict.mjs [status|strict|soft]");
  process.exit(2);
}
if (!env.installed) {
  console.error("dsh-purge environment not detected: " + (env.reason || "unknown"));
  process.exit(1);
}
const target = cmd;
let okAll = true;
for (const f of targetFiles(aiBase)) {
  const r = surgery(f, target);
  console.log((r.ok ? "OK " : "FAIL") + "  " + f.split("/").pop() + "  " + JSON.stringify(r));
  if (!r.ok) okAll = false;
}
if (okAll) writeStateFile({ strict: target === "strict", updatedAt: new Date().toISOString() });
console.log(okAll ? "done; restart DSH to load" : "failed; files untouched where anchors mismatched");
process.exit(okAll ? 0 : 1);
