// 环境探测（无 cordis 依赖，可独立烟测）
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { targetFiles } from "./snapshots.js";
import { detectState } from "./strict-core.js";

export function findDshHome() {
  return process.env.DSH_HOME || path.join(os.homedir(), ".dsh");
}

function aiBaseCacheFile() {
  return path.join(findDshHome(), "dsh-plan-strict", "ai-base.json");
}

export function writeAiBaseCache(aiBase) {
  try {
    fs.mkdirSync(path.dirname(aiBaseCacheFile()), { recursive: true });
    fs.writeFileSync(aiBaseCacheFile(), JSON.stringify({ aiBase, updatedAt: new Date().toISOString() }), "utf8");
  } catch { /* best-effort */ }
}

function looksLikeAiBase(c) {
  try { return fs.statSync(path.join(c, "dsh-base", "cordis.patch.yml")).isFile(); } catch { return false; }
}

/** 宿主 @deepseek-ai 根探测：env 显式覆盖 > 宿主缓存 > execPath 推导(Electron) > DSH_APP > DSH_BASE(两种形态) > 常见安装位 */
export function detectAiBase() {
  if (process.env.PLAN_STRICT_AIBASE) return process.env.PLAN_STRICT_AIBASE;
  try {
    const cached = JSON.parse(fs.readFileSync(aiBaseCacheFile(), "utf8"));
    if (cached && typeof cached.aiBase === "string" && looksLikeAiBase(cached.aiBase)) return cached.aiBase;
  } catch { /* no cache */ }
  const candidates = [];
  try { candidates.push(path.join(path.dirname(process.execPath), "resources", "app", "dsh", "node_modules", "@deepseek-ai")); } catch { /* ignore */ }
  if (process.env.DSH_APP) candidates.push(path.join(process.env.DSH_APP, "resources", "app", "dsh", "node_modules", "@deepseek-ai"));
  if (process.env.DSH_BASE) {
    candidates.push(path.join(process.env.DSH_BASE, "node_modules", "@deepseek-ai"));
    candidates.push(path.join(process.env.DSH_BASE, "..", "node_modules", "@deepseek-ai"));
  }
  for (const root of ["C:\\Program Files\\DeepSeek Harness", "C:\\Program Files (x86)\\DeepSeek Harness", path.join(process.env.LOCALAPPDATA || "", "Programs", "DeepSeek Harness")]) {
    candidates.push(path.join(root, "resources", "app", "dsh", "node_modules", "@deepseek-ai"));
  }
  for (const c of candidates) {
    if (looksLikeAiBase(c)) return c;
  }
  return null;
}

/** 破甲前置检测：
 *  installed = #63 已打（软化标记在）或本组件已操作过（期望态存在）。
 *  纯净官方态（#63 未打且无期望态）→ 惰性（patch-63-not-applied）。 */
export function detectPurgeEnvironment(aiBase) {
  if (!aiBase) return { installed: false, reason: "host-not-located" };
  const files = targetFiles(aiBase);
  let soft = 0;
  let official = 0;
  let present = 0;
  for (const f of files) {
    let text = "";
    try { text = fs.readFileSync(f, "utf8"); present++; } catch { continue; }
    const st = detectState(text);
    soft += st.soft;
    official += st.official;
  }
  if (present === 0) return { installed: false, reason: "targets-missing" };
  const operated = readStateFile() !== null;
  const installed = soft > 0 || operated;
  return { installed, present, soft, official, reason: installed ? undefined : "patch-63-not-applied" };
}

export function readStateFile() {
  try { return JSON.parse(fs.readFileSync(path.join(findDshHome(), "dsh-plan-strict", "state.json"), "utf8")); }
  catch { return null; }
}

export function writeStateFile(state) {
  const dir = path.join(findDshHome(), "dsh-plan-strict");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "state.json");
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state), "utf8");
  fs.renameSync(tmp, file);
}
