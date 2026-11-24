# AGENTS.md — dsh-plan-strict 操作说明

- 本插件只做一件事：dsh-purge #63 的 strict/soft 可逆切换（4 目标 × 3 句）。
- 快照权威来源：dsh-purge-community 1.7.20 的补丁表；官方基线锚定 0.2.2-rc.5 的 .dshpurge.bak（哈希在 lib/snapshots.js）。DSH 升级导致锚点漂移时组件拒绝写入并报 anchor_mismatch——先更新快照再操作。
- 語義：purge 面板的补丁计数会把 #63 显示为未应用/pending（56/57），属预期。
- 生效：切换后必须重启 DSH；旧会话同样走新文本（插件实例为进程级）。
- 自愈：state.json 是期望态真源；宿主启动时 selfHeal 对齐磁盘。
- 未破甲（purge 未装或 #63 未打）时插件完全惰性。
- lab 验证（发版前置）：V1 前置依赖置灰 / V2 逐字节 / V3 旧会话 / V4 apply 自愈 / V5 漂移拒绝 / V6 无头浏览器视觉复检 / V7 CLI 等效。
