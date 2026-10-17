import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { syncActCastOrders } from "../js/showcase-cast-order-sync.js";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("CAST No sync sends only registered casts and never fails the publish", async () => {
  const calls = [];
  const ok = await syncActCastOrders({ rpc: async (name, args) => { calls.push([name, args]); return { error: null }; } }, "act-0023", [
    { characterId: "c-64", castOrder: 2 },
    { characterId: "", castOrder: 1 }
  ]);
  assert.equal(ok.ok, true);
  assert.deepEqual(calls, [["set_act_participant_cast_orders_for_current_user", { p_slug: "act-0023", p_orders: [{ characterId: "c-64", castOrder: 2 }] }]]);

  const warn = console.warn;
  console.warn = () => {};
  try {
    const failed = await syncActCastOrders({ rpc: async () => ({ error: { message: "function does not exist" } }) }, "act-0023", [{ characterId: "c-64", castOrder: 2 }]);
    assert.equal(failed.ok, false);
  } finally {
    console.warn = warn;
  }
  assert.deepEqual(await syncActCastOrders({ rpc: () => assert.fail("no call") }, "act-0023", []), { ok: true, skipped: true });
});

test("cast order RPC is owner-scoped and respects the 1..6 constraint", async () => {
  const sql = await read("supabase/migrations/20261017_act_participant_cast_orders.sql");
  assert.match(sql, /security definer/);
  assert.match(sql, /a\.published_by = v_user_id/);
  assert.match(sql, /ap\.act_id = v_act_id/);
  assert.match(sql, /\^\[1-6\]\$/);
  assert.match(sql, /revoke all on function public\.set_act_participant_cast_orders_for_current_user\(text, jsonb\) from anon/);
  assert.match(sql, /grant execute on function public\.set_act_participant_cast_orders_for_current_user\(text, jsonb\) to authenticated/);
  const manifest = JSON.parse(await read("supabase/migrations-manifest.json"));
  assert.equal(manifest.files.at(-1), "migrations/20261017_act_participant_cast_orders.sql");
});

test("publish and history-only both synchronize CAST No after recording history", async () => {
  const publish = await read("js/showcase-dynamic-publish-v3.js");
  const generator = await read("js/showcase-generator-v3.js");
  assert.match(publish, /syncActCastOrders\(supabase, slug, collectPublicCastOrders\(\)\)/);
  assert.match(generator, /syncActCastOrders\(supabase, slug, castOrders\)/);
});
