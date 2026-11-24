// plan-strict RPC：envelope 解析与端点分发（纯函数，便于单测）
export const RPC_METHOD = "plugin-rpc/plan-strict";

export function parseClientRequest(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { ok: false, code: "invalid-request", message: "body must be an object" };
  if (body.type !== "client-request") return { ok: false, code: "invalid-request", message: "type must be client-request" };
  if (typeof body.rpcId !== "string" || body.rpcId.length === 0) return { ok: false, code: "invalid-request", message: "rpcId must be a non-empty string" };
  if (body.method !== RPC_METHOD) return { ok: false, code: "invalid-request", message: "method mismatch" };
  const p = body.payload;
  if (typeof p !== "object" || p === null || Array.isArray(p)) return { ok: false, code: "invalid-request", message: "payload must be an object" };
  const extra = Object.keys(p).filter((k) => k !== "endpoint" && k !== "payload");
  if (extra.length > 0) return { ok: false, code: "invalid-request", message: "unexpected payload keys" };
  const { endpoint, payload } = p;
  if (typeof endpoint !== "string") return { ok: false, code: "invalid-request", message: "endpoint must be a string" };
  return { ok: true, rpcId: body.rpcId, endpoint, payload: payload ?? {} };
}

/** 端点分发。deps: { status(), set(strict) } */
export function planStrictRpc(deps) {
  return async (endpoint, payload) => {
    if (endpoint === "status") {
      if (Object.keys(payload).length !== 0) return fail("invalid-request", "Expected an empty payload");
      return { ok: true, value: deps.status() };
    }
    if (endpoint === "set") {
      if (typeof payload.strict !== "boolean" || Object.keys(payload).some((k) => k !== "strict")) {
        return fail("invalid-request", "Expected { strict: boolean }");
      }
      return deps.set(payload.strict);
    }
    return fail("unknown-endpoint", "Unknown plan-strict endpoint");
  };
}

function fail(code, message) { return { ok: false, error: { code, message, details: {} } }; }
