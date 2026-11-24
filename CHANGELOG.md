# Changelog

## 0.1.0 (2026-11-24)

首个版本：dsh-purge #63（计划模式软化）的单补丁严格/软化开关。

- **手术内核**：四目标（dsh-base/cordis + dsh-web-app/presets/{ptc,standard,cordis}）× 三处句子逐字节可逆替换；锚点 mixed/unknown 拒绝写入；原子写（tmp+回读+rename）；BOM 防护
- **前置依赖感知**：#63 已打（软化标记）或本组件已操作过才启用；纯净宿主完全惰性（patch-63-not-applied）
- **自愈**：期望态持久化（$DSH_HOME/dsh-plan-strict/state.json），宿主启动时对齐磁盘——终结 purge「应用」重打循环
- **宿主探测**：env 显式覆盖 > 宿主缓存 > Electron execPath > DSH_APP > DSH_BASE > 常见安装位（六级回退）
- **面板**：左侧栏 Plan 入口（与 Purge 并列，order 31）+ main 面板页（状态三行/双开关/四文件列表，zh/en）
- **通道**：plugin-rpc（plugin-rpc/plan-strict）+ webServer 路由（/dsh-plan-strict/status|set）
- **CLI**：scripts/plan-strict.mjs status|strict|soft（免宿主直改+写期望态）
- **验证**：单测 14/14；lab 实测 V1/V2/V4/V6/V7 全过（详见 README 验证状态表）；V3 行为级待桌面实机

### 工程备注

- client factory 必须 return module.exports（ModuleLoader 契约）——v0.1.0 开发中踩过的根因，已修复
- dsh.client.inject 需含 ui-sidebar-right 等完整包集（sidebar.panellist 槽依赖）
