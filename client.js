// dsh-plan-strict client: 左侧栏面板页（与 Purge 并列）+ 计划模式严格开关
// 无构建纯 JS，createElement 模式（学 dsh-breach / dsh-purge 先例）
window.__ModuleLoader__.load({ id: "dsh-plan-strict", factory: (require) => {
  var module = { exports: {} };
  var exports = module.exports;

  const react = require("react");
  const h = react.createElement;
  const { useState, useEffect, useCallback } = react;

  const name = "dsh-plan-strict";
  const inject = ["slots", "locale"];
  const NS = "panel.dsh-plan-strict";

  const zh = {
    nav: "计划模式",
    title: "计划模式严格",
    subtitle: "dsh-purge #63 单补丁开关 · 官方原文逐字节恢复",
    env: "破甲环境",
    envOk: "已检测（#63 已应用）",
    envNo: "未检测（组件不生效）",
    expected: "期望态",
    disk: "磁盘态",
    strict: "严格（官方原文）",
    soft: "软化（破甲）",
    unset: "未设置",
    loading: "读取中…",
    actionStrict: "切换到严格",
    actionSoft: "切换到软化",
    reload: "刷新",
    restartHint: "切换后需重启 DSH 生效（plan-mode 文本随宿主启动加载）",
    done: "已写入磁盘。重启 DSH 后生效。",
    failPrefix: "失败：",
    files: "目标文件（4 个）",
    reason: "原因",
    note: "purge 点「应用」重打后，宿主重启时自动纠正回期望态"
  };
  const en = {
    nav: "Plan Mode",
    title: "Plan Mode Strict",
    subtitle: "Single-patch switch for dsh-purge #63 · byte-exact official restore",
    env: "Purge environment",
    envOk: "detected (#63 applied)",
    envNo: "not detected (component inert)",
    expected: "Expected",
    disk: "On disk",
    strict: "strict (official text)",
    soft: "soft (jailbreak)",
    unset: "unset",
    loading: "loading…",
    actionStrict: "Go strict",
    actionSoft: "Go soft",
    reload: "Reload",
    restartHint: "Restart DSH to load (plan-mode text is fixed at host start)",
    done: "Written to disk. Restart DSH to take effect.",
    failPrefix: "Failed: ",
    files: "Target files (4)",
    reason: "Reason",
    note: "After purge re-applies, host restart self-heals back to the expected state"
  };

  function api(path, init) {
    return fetch(path, Object.assign({ cache: "no-store", credentials: "same-origin" }, init || {})).then((r) => r.json());
  }

  function stateLabel(t, st) {
    if (st === "strict") return t("strict");
    if (st === "soft") return t("soft");
    if (st === "mixed") return "mixed";
    if (st === "missing") return "missing";
    return st || "?";
  }

  function Page({ t } = {}) {
    const tr = t || ((k) => zh[k] || k);
    const [st, setSt] = useState(null);
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState("");
    const load = useCallback(() => {
      setNote("");
      api("/dsh-plan-strict/status").then(setSt).catch((e) => setSt({ error: String((e && e.message) || e) }));
    }, []);
    useEffect(load, [load]);

    const toggle = (strict) => {
      if (busy) return;
      setBusy(true);
      setNote("");
      api("/dsh-plan-strict/set", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ strict })
      })
        .then((d) => {
          setNote(d && d.ok ? tr("done") : tr("failPrefix") + (d && d.error && d.error.message ? d.error.message : JSON.stringify(d)));
          load();
        })
        .catch((e) => setNote(tr("failPrefix") + String((e && e.message) || e)))
        .finally(() => setBusy(false));
    };

    const card = { background: "var(--dsw-alias-bg-base, rgba(128,128,128,0.06))", border: "1px solid var(--dsw-alias-line-1, rgba(128,128,128,0.25))", borderRadius: 8, padding: "12px 14px", marginTop: 12 };
    const rowStyle = { display: "flex", gap: 12, alignItems: "baseline", marginTop: 6 };
    const kStyle = { minWidth: 96, opacity: 0.65 };
    const btn = { padding: "6px 14px", borderRadius: 6, cursor: "pointer" };

    const enabled = Boolean(st && st.purgeInstalled);
    const files = (st && st.files) || [];
    const allStrict = files.length > 0 && files.every((f) => f.state === "strict");
    const allSoft = files.length > 0 && files.every((f) => f.state === "soft");
    const diskText = allStrict ? tr("strict") : allSoft ? tr("soft") : files.length ? "mixed/partial" : tr("loading");

    return h("div", { style: { padding: "18px", maxWidth: 680, margin: "0 auto" } },
      h("h2", { style: { margin: 0 } }, tr("title")),
      h("p", { style: { opacity: 0.7, margin: "6px 0 0" } }, tr("subtitle")),
      st === null ? h("p", { style: { marginTop: 16 } }, tr("loading")) : null,
      st && st.error ? h("p", { style: { marginTop: 16, color: "#c0392b" } }, st.error) : null,
      st && !st.error ? [
        h("div", { style: card },
          h("div", { style: rowStyle }, h("span", { style: kStyle }, tr("env")),
            h("b", null, enabled ? "✓ " + tr("envOk") : "✗ " + tr("envNo") + (st.reason ? "（" + st.reason + "）" : ""))),
          h("div", { style: rowStyle }, h("span", { style: kStyle }, tr("expected")),
            h("span", null, st.expectedStrict === null || st.expectedStrict === undefined ? tr("unset") : (st.expectedStrict ? tr("strict") : tr("soft")))),
          h("div", { style: rowStyle }, h("span", { style: kStyle }, tr("disk")), h("span", null, diskText))
        ),
        h("div", { style: { marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" } },
          h("button", { style: btn, disabled: !enabled || busy, onClick: () => toggle(true) }, tr("actionStrict")),
          h("button", { style: btn, disabled: !enabled || busy, onClick: () => toggle(false) }, tr("actionSoft")),
          h("button", { style: btn, disabled: busy, onClick: load }, tr("reload"))
        ),
        note ? h("p", { style: { margin: "10px 0 0" } }, note) : null,
        h("p", { style: { opacity: 0.65, margin: "8px 0 0", fontSize: 13 } }, tr("restartHint")),
        h("p", { style: { opacity: 0.55, margin: "4px 0 0", fontSize: 13 } }, tr("note")),
        h("div", { style: card },
          h("div", { style: { fontWeight: 600 } }, tr("files")),
          h("ul", { style: { margin: "6px 0 0", paddingLeft: 18 } },
            files.map((f) => h("li", { key: f.file, style: { marginTop: 2 } },
              f.file + " — " + stateLabel(tr, f.state) + "（official " + (f.official === undefined ? "?" : f.official) + " / soft " + (f.soft === undefined ? "?" : f.soft) + "）"))
          )
        )
      ] : null
    );
  }

  function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), "plan-strict locale");
    const t = ctx.locale.bind(NS);
    ctx.slots.inject("settings.section", () => ctx.slots.register(
      { name: "settings.section", id: "dsh-plan-strict", order: 10, label: () => t("nav"), locale: NS, inject: () => ({ t }) },
      Page
    ));
  }

  exports.name = name;
  exports.inject = inject;
  exports.apply = apply;
  return module.exports;
}});
