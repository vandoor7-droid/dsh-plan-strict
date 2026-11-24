# dsh-plan-strict

dsh-purge #63（OFFICIAL_PLAN_MODE_NEUTRAL，计划模式软化）的**单补丁开关**：在「严格官方计划模式」与「破甲软化计划模式」之间一键切换，四目标 × 三处句子逐字节可逆替换。

## 前置依赖
- dsh-purge-community 已安装且已应用补丁（未破甲时本插件完全惰性，RPC 返回 `purge-not-installed`）

## 行为
- **strict**：把 dsh-base/cordis.patch.yml 与 dsh-web-app/presets/{ptc,standard,cordis}.patch.yml 的 plan-mode 段恢复为**官方原文**（逐字节，来源锚定 .dshpurge.bak 基线，SHA-256 见 lib/snapshots.js）
- **soft**：恢复 dsh-purge #63 的软化文本
- 切换后**需重启 DSH**（plan-mode 文本在插件实例构造时固化）
- **自愈**：期望态持久化于 `$DSH_HOME/dsh-plan-strict/state.json`；dsh-purge 点「应用」重打 #63 后，宿主重启时自动纠正回期望态
- 锚点不匹配（mixed/unknown）一律拒绝写入，绝不盲改

## 用法
```sh
node scripts/plan-strict.mjs status   # 查看当前态
node scripts/strict.mjs strict        # → 官方严格计划模式
node scripts/plan-strict.mjs soft     # → 破甲软化
```
RPC（面板用）：`POST /api/plugin-rpc/plan-strict`，envelope 同 plugin-rpc 约定，端点 `status` / `set {strict}`。

## 测试
```sh
node --test tests/
```

MIT License.
