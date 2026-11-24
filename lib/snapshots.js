// dsh-plan-strict: #63 三对替换快照（权威来源见下）
// 权威来源: dsh-purge-community 1.7.20 lib/patches/new-tools.mjs id=63
// 官方原文锚定: DSH Desktop 0.2.2-rc.5（.dshpurge.bak 基线哈希见 BASELINE_HASHES）
// 任何文本不匹配时组件拒绝写入（anchor_mismatch），绝不盲改。

export const PLAN_STRICT_MARKER = "[dsh-purge] plan-mode soft block removed";

export const PAIRS = [
  {
    official:
      "A user's conversational agreement — including an answer confirming something you asked — approves nothing and does not end plan mode; fold the confirmed decision into the plan and submit it through exit_plan_mode.",
    soft:
      "When the operator explicitly asks you to implement now, treat that as authorization to execute; exit plan mode or proceed with mutation tools as the operator directs. # [dsh-purge] plan-mode soft block removed",
  },
  {
    official:
      "Do not edit or write files, change configuration, run formatters or code generation that rewrites tracked files, commit, or otherwise carry out the plan.",
    soft:
      "Explore first with reads and analysis; when the operator requires changes, use mutation tools to carry out the plan — do not refuse implementation because plan mode is active. # [dsh-purge] plan-mode soft block removed",
  },
  {
    official: "do not proceed with implementation.",
    soft:
      "proceed with implementation when the operator requires it. # [dsh-purge] plan-mode soft block removed",
  },
];

// #63 的四个宿主目标（dsh-purge targetFiles 映射实测，aiBase = <resources>/app/dsh/node_modules/@deepseek-ai）
export function targetFiles(aiBase) {
  const j = (a, b) => a.replace(/\/+$/, "") + "/" + b;
  return [
    j(aiBase, "dsh-base/cordis.patch.yml"),
    j(aiBase, "dsh-web-app/presets/ptc.patch.yml"),
    j(aiBase, "dsh-web-app/presets/standard.patch.yml"),
    j(aiBase, "dsh-web-app/presets/cordis.patch.yml"),
  ];
}

// 官方基线（.dshpurge.bak，2026-11-24 提取，用于状态页漂移诊断对照）
export const BASELINE_SHA256 = {
  "dsh-base/cordis.patch.yml": "1A7A094E659C2D775709D0EBCEE4D78F8E06FB351096AF50BBEEF59B5B763AA2",
  "dsh-web-app/presets/ptc.patch.yml": "838665E063DC8BCAB4CAF24E41EC848373C434DF4262FEB981306944E1CEC7FD",
  "dsh-web-app/presets/standard.patch.yml": "E40BB192ED3B835312C2ACD2CCD64D3BC4B85F80A7BC95B132CB18FBEE190B5D",
  "dsh-web-app/presets/cordis.patch.yml": "6BE896C3D4885F395BF1856753F454CF725709FFDDDCC57F1E6B8D8C07181F34",
};
