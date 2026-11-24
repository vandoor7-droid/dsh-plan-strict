import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { PAIRS } from "../lib/snapshots.js";
import { detectState, applyStrict, applySoft, surgery, writeFileAtomic } from "../lib/strict-core.js";

const officialText = [
  "plan policy head",
  PAIRS[0].official,
  "middle line",
  PAIRS[1].official,
  "tail",
  PAIRS[2].official,
  "end",
].join("\n");

const softText = [
  "plan policy head",
  PAIRS[0].soft,
  "middle line",
  PAIRS[1].soft,
  "tail",
  PAIRS[2].soft,
  "end",
].join("\n");

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "plan-strict-"));

test("detectState: official/soft/mixed/unknown", () => {
  assert.equal(detectState(officialText).state, "strict");
  assert.equal(detectState(softText).state, "soft");
  assert.equal(detectState("no anchors here").state, "unknown");
  const mixed = officialText.replace(PAIRS[2].official, PAIRS[2].soft);
  assert.equal(detectState(mixed).state, "mixed");
});

test("roundtrip: strict -> soft -> strict is byte-identical", () => {
  const s1 = applyStrict(softText);
  assert.equal(s1.text, officialText);
  assert.deepEqual(s1.changes, [1, 1, 1]);
  const s2 = applySoft(s1.text);
  assert.equal(s2.text, softText);
});

test("surgery: strict then no-op then back, no tmp residue", () => {
  const dir = tmp();
  const f = path.join(dir, "preset.yml");
  fs.writeFileSync(f, softText, "utf8");
  const r1 = surgery(f, "strict");
  assert.equal(r1.ok, true);
  assert.equal(r1.changed, true);
  assert.deepEqual(r1.changes, [1, 1, 1]);
  assert.equal(fs.readFileSync(f, "utf8"), officialText);
  const r2 = surgery(f, "strict");
  assert.equal(r2.ok, true);
  assert.equal(r2.changed, false);
  const r3 = surgery(f, "soft");
  assert.equal(r3.ok, true);
  assert.equal(fs.readFileSync(f, "utf8"), softText);
  assert.equal(fs.readdirSync(dir).length, 1, "no tmp residue");
});

test("surgery refuses unknown and mixed anchors, file untouched", () => {
  const dir = tmp();
  const f1 = path.join(dir, "a.yml");
  fs.writeFileSync(f1, "nothing relevant", "utf8");
  assert.equal(surgery(f1, "strict").reason, "anchor_mismatch");
  assert.equal(fs.readFileSync(f1, "utf8"), "nothing relevant");
  const f2 = path.join(dir, "b.yml");
  fs.writeFileSync(f2, officialText.replace(PAIRS[0].official, PAIRS[0].soft), "utf8");
  assert.equal(surgery(f2, "strict").reason, "anchor_mismatch");
});

test("surgery on yaml-shaped host snapshot: soft -> strict -> soft", () => {
  const dir = tmp();
  const f = path.join(dir, "cordis.patch.yml");
  const softYaml = "config:\n  section: |\n    You are in plan mode. " + PAIRS[0].soft + "\n    " + PAIRS[1].soft + "\n    stay. " + PAIRS[2].soft + "\n";
  fs.writeFileSync(f, softYaml, "utf8");
  const r = surgery(f, "strict");
  assert.equal(r.ok, true);
  assert.equal(r.changed, true);
  const text = fs.readFileSync(f, "utf8");
  assert.ok(text.includes(PAIRS[0].official));
  assert.ok(text.includes(PAIRS[1].official));
  assert.ok(text.includes(PAIRS[2].official));
  assert.ok(!text.includes("[dsh-purge]"));
  const back = surgery(f, "soft");
  assert.equal(back.ok, true);
  assert.equal(fs.readFileSync(f, "utf8"), softYaml);
});

test("writeFileAtomic roundtrip and no residue", () => {
  const dir = tmp();
  const f = path.join(dir, "w.txt");
  writeFileAtomic(f, "hello 中文 — dash\n");
  assert.equal(fs.readFileSync(f, "utf8"), "hello 中文 — dash\n");
  assert.equal(fs.readdirSync(dir).filter((x) => x.endsWith(".tmp")).length, 0);
});
