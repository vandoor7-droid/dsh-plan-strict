import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { targetFiles } from "../lib/snapshots.js";
import { applySoft, applyStrict, detectState } from "../lib/strict-core.js";
import { detectPurgeEnvironment } from "../lib/detect.js";
import { selfHeal } from "../lib/heal.js";

const aiBase = "D:/dsh-lab/cli/node_modules/@deepseek-ai";
const home = "D:/dsh-lab";
process.env.DSH_HOME = home;
process.env.PLAN_STRICT_AIBASE = aiBase;

const files = targetFiles(aiBase);
const results = [];
const step = (name, ok, detail) => { results.push({ name, ok, detail: detail === undefined ? "" : JSON.stringify(detail) }); console.log((ok ? "PASS" : "FAIL") + "  " + name + (detail === undefined ? "" : "  " + JSON.stringify(detail))); };

fs.mkdirSync("D:/tmp", { recursive: true });
const before = files.map((f) => detectState(fs.readFileSync(f, "utf8")).state);
console.log("lab plan-mode states BEFORE fixture:", JSON.stringify(before));

const backupDir = fs.mkdtempSync(path.join("D:/tmp", "lab-ps-"));
const backups = files.map((f, i) => {
  const dst = path.join(backupDir, String(i) + ".yml");
  fs.copyFileSync(f, dst);
  return dst;
});
// 官方基线：官方态原样；若 lab 已被打软化则取 applyStrict 结果
const baselines = backups.map((b, i) => {
  const text = fs.readFileSync(b, "utf8");
  return before[i] === "strict" ? text : applyStrict(text).text;
});

// fixture：复现破甲（#63 软化）
for (const f of files) {
  const r = applySoft(fs.readFileSync(f, "utf8"));
  fs.writeFileSync(f, r.text, "utf8");
}
const afterFix = files.map((f) => detectState(fs.readFileSync(f, "utf8")).state);
step("fixture applySoft -> all soft", afterFix.every((s) => s === "soft"), afterFix);

const env = detectPurgeEnvironment(aiBase);
step("prerequisite: installed, soft=12", env.installed === true && env.soft === 12, { soft: env.soft });

// V2: CLI strict（全新输入试跑）
try { fs.rmSync(path.join(home, "dsh-plan-strict"), { recursive: true, force: true }); } catch { /* ignore */ }
const node = process.execPath;
let cliOut = "";
try {
  cliOut = execFileSync(node, ["scripts/plan-strict.mjs", "strict"], { cwd: process.cwd(), timeout: 30000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
} catch (e) { cliOut = "CLI_ERROR exit=" + e.status + "\nstdout: " + (e.stdout || "") + "\nstderr: " + (e.stderr || ""); }
console.log("CLI output:\n" + cliOut.slice(0, 900));
const afterStrict = files.map((f) => detectState(fs.readFileSync(f, "utf8")).state);
step("V2 CLI strict -> all strict", afterStrict.every((s) => s === "strict"), afterStrict);
let byteOk = true;
files.forEach((f, i) => { if (fs.readFileSync(f, "utf8") !== baselines[i]) byteOk = false; });
step("V2 byte-identical to official baseline", byteOk);

// V4: 模拟 purge 重新 apply（soft 回来）-> selfHeal 恢复 strict
for (const f of files) {
  const r = applySoft(fs.readFileSync(f, "utf8"));
  fs.writeFileSync(f, r.text, "utf8");
}
const heal = selfHeal(aiBase);
const afterHeal = files.map((f) => detectState(fs.readFileSync(f, "utf8")).state);
step("V4 selfHeal after re-soft -> 4 healed, all strict", heal.healed.length === 4 && afterHeal.every((s) => s === "strict"), { healed: heal.healed.length });

// V1: 官方态 + 无期望态 -> 惰性 + CLI 拒绝
try { fs.rmSync(path.join(home, "dsh-plan-strict"), { recursive: true, force: true }); } catch { /* ignore */ }
const env2 = detectPurgeEnvironment(aiBase);
step("V1 pristine -> inert", env2.installed === false && env2.reason === "patch-63-not-applied", env2);
let cliRejected = false;
try {
  execFileSync(node, ["scripts/plan-strict.mjs", "strict"], { cwd: process.cwd(), timeout: 30000, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
} catch (e) { cliRejected = e.status === 1; }
step("V1 CLI strict refuses on pristine host", cliRejected);

// 清理：恢复 lab 原状 + 零残留
files.forEach((f, i) => fs.copyFileSync(backups[i], f));
try { fs.rmSync(path.join(home, "dsh-plan-strict"), { recursive: true, force: true }); } catch { /* ignore */ }
fs.rmSync(backupDir, { recursive: true, force: true });
const final = files.map((f) => detectState(fs.readFileSync(f, "utf8")).state);
step("cleanup: lab restored, zero residue", JSON.stringify(final) === JSON.stringify(before) && !fs.existsSync(path.join(home, "dsh-plan-strict")), final);

const failed = results.filter((r) => !r.ok);
console.log("\n== LAB FILE-LEVEL VERIFICATION: " + (failed.length === 0 ? "ALL " + results.length + " PASS" : failed.length + " FAILED") + " ==");
process.exit(failed.length === 0 ? 0 : 1);
