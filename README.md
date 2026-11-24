# dsh-plan-strict

dsh-purge #63（OFFICIAL_PLAN_MODE_NEUTRAL，计划模式软化）的**单补丁开关**：在「严格官方计划模式」与「破甲软化计划模式」之间一键切换，四目标 × 三处句子**逐字节可逆替换**。

## 它解决什么

dsh-purge 的补丁开关只有组级粒度（`permissionPatches`）与 opt-in（#18/#19）；#63 属于"普通默认补丁"——**无任何官方开关**，且每次点「应用」都会重打。本插件补上这一个开关：

- **strict**：四个宿主 preset 的 plan-mode 段恢复为官方原文（逐字节，基线锚定 .dshpurge.bak，SHA-256 见 lib/snapshots.js）
- **soft**：恢复 dsh-purge #63 的软化文本
- **自愈**：期望态持久化于 `$DSH_HOME/dsh-plan-strict/state.json`；purge 点「应用」重打 #63 后，宿主重启时自动纠正回期望态——apply 循环终结
- 切换后需重启 DSH（plan-mode 文本在插件实例构造时固化）；旧会话同样走新文本
- 锚点不匹配（mixed/unknown）一律拒绝写入，绝不盲改

## 前置依赖

- dsh-purge-community 已安装且 #63 已应用（未破甲时本插件完全惰性，面板置灰显示诊断原因）

## 安装（DSH 插件管理器）

插件 → 添加插件 → 填仓库地址：

```
https://github.com/vandoor7-droid/dsh-plan-strict
```

## 使用

- **面板**：左侧栏「Plan」入口（与 Purge 并列）——状态三行（破甲环境/期望态/磁盘态）+ 严格/软化双按钮 + 四文件逐条状态
- **CLI**（免宿主）：
```sh
node scripts/plan-strict.mjs status   # 查看当前态
node scripts/plan-strict.mjs strict   # → 官方严格计划模式
node scripts/plan-strict.mjs soft     # → 破甲软化
```
- **RPC**：`POST /api/plugin-rpc/plan-strict`（envelope 同 plugin-rpc 约定）端点 `status` / `set {strict}`；`GET/POST /dsh-plan-strict/status|set`（webServer 路由）

## 与 purge 状态机的互操作

开关 strict 后，purge 面板会把 #63 显示为"未应用/pending"（补丁计数 57→56 之类）——语义一致的正常表现，不是冲突。

## 验证状态（v0.1.0）

| 项 | 结果 | 证据 |
|---|---|---|
| 单元测试 | 14/14 | 替换矩阵字节级往返 / 锚点异常拒绝 / 原子写无残留 / envelope 校验 |
| V1 前置惰性 | PASS | lab 实测：纯净宿主（#63 未打）→ 组件惰性 + CLI 拒绝 |
| V2 逐字节恢复 | PASS | lab 实测：CLI strict → 四文件与官方基线逐字节一致 |
| V4 apply 自愈 | PASS×2 | 单测 + lab 实测（宿主内）：soft×4 + 期望 strict → 重启 → strict×4 |
| V6 视觉复检 | PASS | 无头浏览器：侧栏入口/面板渲染/开关交互/状态实时刷新；vision 复检布局无乱码 |
| V7 CLI 等效 | PASS | lab 验证全程走 CLI |
| V3 行为级 | 待桌面实机 | 字节级 + 源码加载机制双证据已锁定（PlanModeController 构造时固化 section）；最终行为验证随桌面安装做 |
| V5 漂移拒绝 | PASS | 单测：unknown/mixed → anchor_mismatch 文件零改动 |

## 开发

```sh
node --test tests/            # 14 项单测
node .scripts.../lab-verify   # scripts/lab-verify.mjs：对 lab 宿主树的可复跑验收
```

MIT License.
