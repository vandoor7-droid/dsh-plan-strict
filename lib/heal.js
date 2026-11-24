// 启动自愈：期望态 vs 磁盘态对齐（无 cordis 依赖）
import fs from "node:fs";
import { targetFiles } from "./snapshots.js";
import { detectState, surgery } from "./strict-core.js";
import { readStateFile } from "./detect.js";

/** 对齐所有目标文件到期望态；返回实际修复清单。 */
export function selfHeal(aiBase) {
  const state = readStateFile();
  if (!state || typeof state.strict !== "boolean" || !aiBase) return { healed: [], skipped: "no-expected-state" };
  const target = state.strict ? "strict" : "soft";
  const healed = [];
  for (const f of targetFiles(aiBase)) {
    try {
      const cur = detectState(fs.readFileSync(f, "utf8"));
      if (cur.state !== target && cur.state !== "unknown" && cur.state !== "mixed") {
        const r = surgery(f, target);
        if (r.ok && r.changed) healed.push({ file: f.split(/[\\/]/).pop(), from: cur.state, to: target });
      }
    } catch { /* best-effort per file */ }
  }
  return { healed };
}
