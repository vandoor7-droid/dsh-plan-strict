import test from "node:test";
import assert from "node:assert/strict";
import { parseClientRequest, planStrictRpc, RPC_METHOD } from "../lib/rpc-core.js";

const envelope = (endpoint, payload) => ({ type: "client-request", rpcId: "r1", method: RPC_METHOD, payload: { endpoint, payload } });

test("parseClientRequest accepts valid envelope", () => {
  const r = parseClientRequest(envelope("status", {}));
  assert.equal(r.ok, true);
  assert.equal(r.endpoint, "status");
});

test("parseClientRequest rejects bad envelopes", () => {
  assert.equal(parseClientRequest(null).ok, false);
  assert.equal(parseClientRequest({ type: "x" }).ok, false);
  assert.equal(parseClientRequest(envelope("status", {}).method && { type: "client-request", rpcId: "r", method: "other", payload: { endpoint: "status" } }).ok, false);
  assert.equal(parseClientRequest({ type: "client-request", rpcId: "r", method: RPC_METHOD, payload: { endpoint: "status", extra: 1 } }).ok, false);
  assert.equal(parseClientRequest({ type: "client-request", rpcId: "r", method: RPC_METHOD, payload: { payload: {} } }).ok, false);
});

test("endpoints: status / set / unknown", async () => {
  let asked = null;
  const rpc = planStrictRpc({
    status: () => ({ purgeInstalled: true }),
    set: (strict) => { asked = strict; return { ok: true, value: { restartRequired: true } }; },
  });
  const s = await rpc("status", {});
  assert.equal(s.ok, true);
  assert.equal(s.value.purgeInstalled, true);
  assert.equal((await rpc("status", { x: 1 })).ok, false);
  const set = await rpc("set", { strict: true });
  assert.equal(set.ok, true);
  assert.equal(asked, true);
  assert.equal((await rpc("set", { strict: "yes" })).ok, false);
  assert.equal((await rpc("nope", {})).error.code, "unknown-endpoint");
});
