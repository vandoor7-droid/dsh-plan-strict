import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { PAIRS } from "../lib/snapshots.js";
import { applyStrict, applySoft, detectState } from "../lib/strict-core.js";
import { detectPurgeEnvironment, readStateFile, writeStateFile } from "../lib/detect.js";
import { selfHeal } from "../lib/heal.js";

const official = ["head", PAIRS[0].official, "m", PAIRS[1].official, "t", PAIRS[2].official, "end"].join("\n");
const softText = ["head", PAIRS[0].soft, "m", PAIRS[1].soft, "t", PAIRS[2].soft, "end"].join("\n");

function fakeEnv() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ps-home-"));
  const aiBase = fs.mkdtempSync(path.join(os.tmpdir(), "ps-aibase-"));
  const targets = [
    path.join(aiBase, "dsh-base", "cordis.patch.yml"),
    path.join(aiBase, "dsh-web-app", "presets", "ptc.patch.yml"),
    path.join(aiBase, "dsh-web-app", "presets", "standard.patch.yml"),
    path.join(aiBase, "dsh-web-app", "presets", "cordis.patch.yml"),
  ];
  for (const f of targets) {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, official, "utf8");
  }
  process.env.DSH_HOME = home;
  process.env.PLAN_STRICT_AIBASE = aiBase;
  return { home, aiBase, targets };
}

test("V1: pristine host (official text, no expectation) -> inert", () => {
  const { aiBase } = fakeEnv();
  const env = detectPurgeEnvironment(aiBase);
  assert.equal(env.installed, false);
  assert.equal(env.reason, "patch-63-not-applied");
  assert.equal(env.official, 12);
  assert.equal(env.soft, 0);
});

test("jailbroken host (soft text) -> installed", () => {
  const { aiBase, targets } = fakeEnv();
  for (const f of targets) fs.writeFileSync(f, softText, "utf8");
  const env = detectPurgeEnvironment(aiBase);
  assert.equal(env.installed, true);
  assert.equal(env.soft, 12);
});

test("operated marker alone enables (strict state after our own toggle)", () => {
  const { aiBase } = fakeEnv(); // files stay official
  writeStateFile({ strict: true, updatedAt: "2026-11-24T00:00:00Z" });
  const env = detectPurgeEnvironment(aiBase);
  assert.equal(env.installed, true);
  assert.equal(readStateFile().strict, true);
});

test("V4: self-heal restores strict after re-soft (simulated purge re-apply)", () => {
  const { aiBase, targets } = fakeEnv();
  for (const f of targets) fs.writeFileSync(f, softText, "utf8");
  writeStateFile({ strict: true, updatedAt: "2026-11-24T00:00:00Z" });
  const r1 = selfHeal(aiBase);
  assert.equal(r1.healed.length, 4);
  for (const f of targets) assert.equal(detectState(fs.readFileSync(f, "utf8")).state, "strict");
  // purge re-applied #63 (soft again) — selfHeal must restore strict
  for (const f of targets) fs.writeFileSync(f, softText, "utf8");
  const r2 = selfHeal(aiBase);
  assert.equal(r2.healed.length, 4);
  for (const f of targets) assert.equal(detectState(fs.readFileSync(f, "utf8")).state, "strict");
});

test("self-heal no-op when aligned and skipped when no expectation", () => {
  const { aiBase, targets } = fakeEnv();
  assert.equal(selfHeal(aiBase).skipped, "no-expected-state");
  for (const f of targets) fs.writeFileSync(f, softText, "utf8");
  writeStateFile({ strict: false, updatedAt: "2026-11-24T00:00:00Z" });
  const r = selfHeal(aiBase);
  assert.equal(r.healed.length, 0);
  for (const f of targets) assert.equal(detectState(fs.readFileSync(f, "utf8")).state, "soft");
});
