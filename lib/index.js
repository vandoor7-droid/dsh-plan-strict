// dsh-plan-strict：dsh-purge #63 的单补丁严格/软化开关
// 前置依赖：dsh-purge-community（未破甲时组件完全惰性）
import fs from "node:fs";
import path from "node:path";
import { Service } from "@deepseek-ai/cordis";
import { targetFiles } from "./snapshots.js";
import { detectState, surgery } from "./strict-core.js";
import { planStrictRpc, parseClientRequest } from "./rpc-core.js";
import { detectAiBase, detectPurgeEnvironment, readStateFile, writeStateFile, writeAiBaseCache } from "./detect.js";

export const name = "dsh-plan-strict";

export default class PlanStrict extends Service {
  constructor(ctx) {
    super(ctx, "planStrict");
    // 一切安装动作 best-effort：失败不影响服务注册（行被 dispose 的代价高于功能缺失）
    try {
      this.aiBase = detectAiBase();
      if (this.aiBase) writeAiBaseCache(this.aiBase);
      this.env = detectPurgeEnvironment(this.aiBase);
      this.installRpc(ctx);
      void this.selfHeal().catch((e) => ctx.logger.warn("plan-strict: startup self-heal failed: " + String(e && e.message ? e.message : e)));
    } catch (error) {
      ctx.logger.error("plan-strict: install failed; service stays registered");
      ctx.logger.error(error);
    }
  }

  status() {
    const files = this.aiBase ? targetFiles(this.aiBase) : [];
    const rows = files.map((f) => {
      try { return { file: path.basename(f), ...detectState(fs.readFileSync(f, "utf8")) }; }
      catch { return { file: path.basename(f), state: "missing" }; }
    });
    const state = readStateFile();
    return {
      version: "0.1.0",
      purgeInstalled: this.env.installed,
      reason: this.env.reason || undefined,
      expectedStrict: state && typeof state.strict === "boolean" ? state.strict : null,
      restartRequired: true,
      note: "plan-mode text loads at host start; toggle then restart DSH",
      files: rows,
    };
  }

  async set(strict) {
    if (!this.env.installed) return { ok: false, error: { code: "purge-not-installed", message: "dsh-purge environment not detected", details: {} } };
    const files = targetFiles(this.aiBase);
    const results = [];
    for (const f of files) {
      try { results.push(surgery(f, strict ? "strict" : "soft")); }
      catch (e) { results.push({ ok: false, file: f, reason: "io_error", message: String(e && e.message ? e.message : e) }); }
    }
    const okAll = results.every((r) => r.ok);
    if (okAll) writeStateFile({ strict, updatedAt: new Date().toISOString() });
    return { ok: okAll, value: { results, restartRequired: true } };
  }

  async selfHeal() {
    const state = readStateFile();
    if (!state || typeof state.strict !== "boolean" || !this.env.installed) return;
    for (const f of targetFiles(this.aiBase)) {
      try {
        const cur = detectState(fs.readFileSync(f, "utf8"));
        const target = state.strict ? "strict" : "soft";
        if (cur.state !== target && cur.state !== "unknown" && cur.state !== "mixed") surgery(f, target);
      } catch { /* best-effort */ }
    }
  }

  installRpc(ctx) {
    ctx.inject(["connection"], (scope) => scope.effect(() => {
      const handler = planStrictRpc({ status: () => this.status(), set: (s) => this.set(s) });
      const dispose = scope.connection.fetch.register({
        path: "/api/plugin-rpc/plan-strict",
        methods: ["POST"],
        requestBody: "buffered",
        fetch: async (request) => {
          try {
            const body = await request.json();
            const parsed = parseClientRequest(body);
            if (!parsed.ok) return Response.json({ type: "server-response", rpcId: "", result: parsed });
            const result = await handler(parsed.endpoint, parsed.payload);
            return Response.json({ type: "server-response", rpcId: parsed.rpcId, result });
          } catch {
            return new Response("Internal Server Error", { status: 500 });
          }
        },
      });
      return async () => { await dispose(); };
    }, "plan-strict: lifecycle-owned RPC"));
  }
}
