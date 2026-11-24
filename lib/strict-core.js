// 手术内核：判态 + 三处句子替换 + 原子写 + 回读校验
import fs from "node:fs";
import { PAIRS } from "./snapshots.js";

function countOf(text, needle) {
  let n = 0;
  let i = text.indexOf(needle);
  while (i !== -1) { n++; i = text.indexOf(needle, i + needle.length); }
  return n;
}

/** 判态: strict(全官方) / soft(全软化) / mixed(部分) / unknown(锚点都不在) */
export function detectState(text) {
  const rows = PAIRS.map((p) => ({ official: countOf(text, p.official), soft: countOf(text, p.soft) }));
  const official = rows.reduce((n, r) => n + r.official, 0);
  const soft = rows.reduce((n, r) => n + r.soft, 0);
  let state = "unknown";
  if (soft > 0 && official > 0) state = "mixed";
  else if (soft > 0) state = "soft";
  else if (official > 0) state = "strict";
  return { state, official, soft, rows };
}

function rewrite(text, fromKey, toKey) {
  let out = text;
  const changes = [];
  for (const p of PAIRS) {
    const from = p[fromKey];
    const to = p[toKey];
    let n = 0;
    for (;;) {
      const i = out.indexOf(from);
      if (i === -1) break;
      out = out.slice(0, i) + to + out.slice(i + from.length);
      n++;
    }
    changes.push(n);
  }
  return { text: out, changes };
}

export function applyStrict(text) { return rewrite(text, "soft", "official"); }
export function applySoft(text) { return rewrite(text, "official", "soft"); }

/** 原子写: tmp -> 回读校验 -> rename */
export function writeFileAtomic(file, text) {
  const tmp = file + ".plan-strict.tmp";
  fs.writeFileSync(tmp, text, "utf8");
  const back = fs.readFileSync(tmp, "utf8");
  if (back !== text) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw new Error("tmp roundtrip mismatch: " + tmp);
  }
  fs.renameSync(tmp, file);
}

/** 单文件手术。target: "strict" | "soft"。锚点异常一律拒绝不改。 */
export function surgery(file, target) {
  const before = fs.readFileSync(file, "utf8");
  const beforeState = detectState(before);
  if (beforeState.state === "unknown" || beforeState.state === "mixed") {
    return { ok: false, file, state: beforeState.state, reason: "anchor_mismatch" };
  }
  if (beforeState.state === target) {
    return { ok: true, file, changed: false, state: beforeState.state };
  }
  const res = target === "strict" ? applyStrict(before) : applySoft(before);
  const afterState = detectState(res.text);
  if (afterState.state !== target || afterState.soft + afterState.official !== beforeState.soft + beforeState.official) {
    return { ok: false, file, state: beforeState.state, after: afterState.state, reason: "post_rewrite_mismatch" };
  }
  if (res.text.charCodeAt(0) === 0xfeff) {
    return { ok: false, file, reason: "bom_introduced" };
  }
  writeFileAtomic(file, res.text);
  return { ok: true, file, changed: true, changes: res.changes, before: beforeState.state, after: afterState.state };
}
