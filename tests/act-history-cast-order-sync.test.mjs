import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { syncActCastOrders, MAX_PARTICIPATION_ROLE_LENGTH } from "../js/showcase-cast-order-sync.js";

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
  const index = manifest.files.indexOf("migrations/20261017_act_participant_cast_orders.sql");
  assert.ok(index > manifest.files.indexOf("migrations/20261017_restore_snapshot_via_ofc_save.sql"), "cast order migration must stay registered after the snapshot restore migration");
});

test("publish and history-only both synchronize CAST No after recording history", async () => {
  const publish = await read("js/showcase-dynamic-publish-v3.js");
  const generator = await read("js/showcase-generator-v3.js");
  assert.match(publish, /syncActCastOrders\(supabase, slug, collectPublicCastOrders\(\)\)/);
  assert.match(generator, /syncActCastOrders\(supabase, slug, castOrders\)/);
});

test("the sync sends each registered cast's 参加枠 next to its CAST No: trimmed, cut to 80 characters, an empty one too, nothing for a missing one", async () => {
  const calls = [];
  const supabase = { rpc: async (name, args) => { calls.push([name, args]); return { error: null }; } };
  assert.equal(MAX_PARTICIPATION_ROLE_LENGTH, 80);
  const long = "あ".repeat(100);
  const surrogate = "𠮷".repeat(90); // characters outside the BMP count as one each, like the column's char_length
  const result = await syncActCastOrders(supabase, "act-0030", [
    { characterId: "c-1", castOrder: 1, participationRole: "  カタナ  " },
    { characterId: "c-2", castOrder: 2, participationRole: "" },
    { characterId: "c-3", castOrder: 3, participationRole: long },
    { characterId: "c-4", castOrder: 4 },
    { characterId: "c-5", participationRole: "共通" },
    { characterId: "c-6", participationRole: surrogate },
    { characterId: "c-7", castOrder: "3", participationRole: 5 },
    { characterId: "", castOrder: 1, participationRole: "捨てる" }
  ]);
  assert.equal(result.ok, true);
  const [[name, args]] = calls;
  assert.equal(name, "set_act_participant_cast_orders_for_current_user");
  assert.equal(args.p_slug, "act-0030");
  assert.deepEqual(args.p_orders, [
    { characterId: "c-1", castOrder: 1, participationRole: "カタナ" },
    { characterId: "c-2", castOrder: 2, participationRole: "" },
    { characterId: "c-3", castOrder: 3, participationRole: "あ".repeat(80) },
    { characterId: "c-4", castOrder: 4 },
    { characterId: "c-5", participationRole: "共通" },
    { characterId: "c-6", participationRole: "𠮷".repeat(80) }
  ]);
  // an item with neither a CAST No nor a role is not sent at all
  assert.deepEqual(await syncActCastOrders({ rpc: () => assert.fail("no call") }, "act-0030", [{ characterId: "c-9" }]), { ok: true, skipped: true });
});

test("a failing role sync is reported as not ok and never throws", async () => {
  const warn = console.warn;
  console.warn = () => {};
  try {
    const failed = await syncActCastOrders({ rpc: async () => ({ error: { message: "function does not exist" } }) }, "act-0030", [{ characterId: "c-1", castOrder: 1, participationRole: "共通" }]);
    assert.equal(failed.ok, false);
  } finally {
    console.warn = warn;
  }
});

test("the role migration widens the same owner-scoped RPC: optional role per item, the stored role kept when it is not sent, 80 characters, same grants", async () => {
  const sql = await read("supabase/migrations/20261114_act_participant_roles.sql");
  assert.match(sql, /create or replace function public\.set_act_participant_cast_orders_for_current_user\(\s*p_slug text,\s*p_orders jsonb\s*\)/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = public, pg_temp/);
  assert.match(sql, /a\.published_by = v_user_id/);
  assert.match(sql, /ap\.act_id = v_act_id/);
  assert.match(sql, /\^\[1-6\]\$/);
  assert.match(sql, /jsonb_typeof\(item->'participationRole'\) = 'string'/);
  assert.match(sql, /left\(btrim\(item->>'participationRole'\), 80\)/);
  // what is not sent is kept
  assert.match(sql, /cast_order = coalesce\(r\.cast_order, ap\.cast_order\)/);
  assert.match(sql, /participation_role = coalesce\(r\.participation_role, ap\.participation_role\)/);
  assert.match(sql, /revoke all on function public\.set_act_participant_cast_orders_for_current_user\(text, jsonb\) from anon/);
  assert.match(sql, /grant execute on function public\.set_act_participant_cast_orders_for_current_user\(text, jsonb\) to authenticated/);
  // nothing else changes: no table, column, policy or other function
  assert.doesNotMatch(sql, /alter table|create table|create policy|drop function|drop table/i);
  const manifest = JSON.parse(await read("supabase/migrations-manifest.json"));
  assert.ok(manifest.files.indexOf("migrations/20261114_act_participant_roles.sql") > manifest.files.indexOf("migrations/20261017_act_participant_cast_orders.sql"), "registered after the CAST No migration");
  assert.equal(manifest.files.at(-1), "migrations/20261114_act_participant_roles.sql");
  // the applied migration is not edited
  const first = await read("supabase/migrations/20261017_act_participant_cast_orders.sql");
  assert.doesNotMatch(first, /participationRole/);
});

test("publish and history-only send the row's 参加枠 with its CAST No; no module wraps supabase.rpc / functions.invoke any more", async () => {
  const publish = await read("js/showcase-dynamic-publish-v3.js");
  const generator = await read("js/showcase-generator-v3.js");
  assert.match(publish, /participationRole: String\(row\.querySelector\('\[data-field="quote"\]'\)\?\.value \?\? ""\)/);
  assert.match(generator, /participationRole: String\(item\.quote \?\? ""\)/);
  // only registered casts (a character id) are sent, as before
  assert.match(generator, /\.filter\(\(\{ item \}\) => !item\.manual && item\.character\.id\)/);
  const loader = await read("js/showcase-generator-loader.js");
  assert.doesNotMatch(loader, /history-role/);
  await assert.rejects(() => read("js/showcase-history-role.js"), /ENOENT/);
  const result = await read("js/showcase-publish-result.js");
  assert.match(result, /CAST No\.と参加枠は更新できませんでした/);
});
