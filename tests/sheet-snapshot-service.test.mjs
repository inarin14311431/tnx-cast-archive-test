import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SNAPSHOTS,
  formatDate,
  listSnapshots,
  createSnapshot,
  createBundleSnapshot,
  restoreSnapshot,
  deleteSnapshot
} from "../js/sheet-snapshot-service.js";

// Minimal recording fake for the Supabase query-builder/RPC surface this
// service uses. Each chain call is appended to `calls`; awaiting the
// builder (or calling .rpc()) resolves with the fixture `result`. There is
// no existing Supabase-mocking convention in this repo's tests (other
// Supabase-touching specs assert on source text, not behavior), so this is
// a self-contained, dependency-injected stand-in local to this file.
function createRecordingClient(result = { data: null, error: null }) {
  const calls = [];

  function makeBuilder() {
    const builder = {
      select: (...args) => { calls.push(["select", ...args]); return builder; },
      eq: (...args) => { calls.push(["eq", ...args]); return builder; },
      order: (...args) => { calls.push(["order", ...args]); return builder; },
      limit: (...args) => { calls.push(["limit", ...args]); return builder; },
      delete: (...args) => { calls.push(["delete", ...args]); return builder; },
      then: (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected)
    };
    return builder;
  }

  return {
    calls,
    from: table => { calls.push(["from", table]); return makeBuilder(); },
    rpc: (name, params) => { calls.push(["rpc", name, params]); return Promise.resolve(result); }
  };
}

test("formatDate renders ja-JP year/month/day/hour/minute and falls back to the raw value on failure", () => {
  const formatted = formatDate("2026-01-02T03:04:00Z");
  assert.match(formatted, /2026/);
  assert.match(formatted, /01/);
  assert.match(formatted, /02/);
  // `new Date(undefined)` is an Invalid Date, so Intl.DateTimeFormat throws
  // and formatDate falls back to `String(value || "")`.
  assert.equal(formatDate(undefined), "");
  // `new Date(null)` coerces to the epoch, which formats fine (no fallback).
  assert.notEqual(formatDate(null), "");
  // A genuinely unparsable string also falls back to itself.
  assert.equal(formatDate("not-a-date"), "not-a-date");
});

test("MAX_SNAPSHOTS matches the database's retention cap", () => {
  assert.equal(MAX_SNAPSHOTS, 10);
});

test("listSnapshots selects id/label/created_at for the character, newest first, capped at MAX_SNAPSHOTS", async () => {
  const rows = [{ id: "s1", label: "A", created_at: "2026-01-01" }];
  const client = createRecordingClient({ data: rows, error: null });

  const result = await listSnapshots("char-1", client);

  assert.deepEqual(result, { data: rows, error: null });
  assert.deepEqual(client.calls, [
    ["from", "character_snapshots"],
    ["select", "id,label,created_at"],
    ["eq", "character_id", "char-1"],
    ["order", "created_at", { ascending: false }],
    ["limit", MAX_SNAPSHOTS]
  ]);
});

test("createSnapshot calls create_character_snapshot with the character id and trimmed label", async () => {
  const client = createRecordingClient({ data: { id: "new-snap" }, error: null });

  const result = await createSnapshot("char-1", "  アクト終了時  ", client);

  assert.deepEqual(result, { data: { id: "new-snap" }, error: null });
  assert.deepEqual(client.calls, [
    ["rpc", "create_character_snapshot", { p_character_id: "char-1", p_label: "アクト終了時" }]
  ]);
});

test("createSnapshot defaults the label to an empty string", async () => {
  const client = createRecordingClient();
  await createSnapshot("char-1", undefined, client);
  assert.deepEqual(client.calls, [
    ["rpc", "create_character_snapshot", { p_character_id: "char-1", p_label: "" }]
  ]);
});

test("createBundleSnapshot calls create_character_snapshot_from_bundle with character id, trimmed label and the bundle data", async () => {
  const client = createRecordingClient({ data: { id: "bundle-snap" }, error: null });
  const bundle = { character: {}, skills: [], outfits: [] };

  const result = await createBundleSnapshot("char-1", bundle, "  比較版  ", client);

  assert.deepEqual(result, { data: { id: "bundle-snap" }, error: null });
  assert.deepEqual(client.calls, [
    ["rpc", "create_character_snapshot_from_bundle", {
      p_character_id: "char-1",
      p_label: "比較版",
      p_snapshot_data: bundle
    }]
  ]);
});

test("restoreSnapshot calls restore_character_snapshot with the snapshot id", async () => {
  const client = createRecordingClient({ data: null, error: null });

  const result = await restoreSnapshot("snap-1", client);

  assert.deepEqual(result, { data: null, error: null });
  assert.deepEqual(client.calls, [
    ["rpc", "restore_character_snapshot", { p_snapshot_id: "snap-1" }]
  ]);
});

test("deleteSnapshot deletes from character_snapshots by id", async () => {
  const client = createRecordingClient({ data: null, error: null });

  const result = await deleteSnapshot("snap-1", client);

  assert.deepEqual(result, { data: null, error: null });
  assert.deepEqual(client.calls, [
    ["from", "character_snapshots"],
    ["delete"],
    ["eq", "id", "snap-1"]
  ]);
});

test("every function propagates a Supabase error untouched instead of throwing", async () => {
  const failure = { data: null, error: { message: "boom" } };
  const client = createRecordingClient(failure);

  assert.deepEqual(await listSnapshots("char-1", client), failure);
  assert.deepEqual(await createSnapshot("char-1", "", client), failure);
  assert.deepEqual(await createBundleSnapshot("char-1", {}, "", client), failure);
  assert.deepEqual(await restoreSnapshot("snap-1", client), failure);
  assert.deepEqual(await deleteSnapshot("snap-1", client), failure);
});
