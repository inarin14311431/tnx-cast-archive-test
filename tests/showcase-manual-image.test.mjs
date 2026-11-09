import assert from "node:assert/strict";
import test from "node:test";
import {
  MANUAL_IMAGE_BUCKET,
  MANUAL_IMAGE_MAX_BYTES,
  createImageLedger,
  manualImagePath,
  manualImagePathFromUrl,
  removeManualImages,
  uploadManualImage,
  validateManualImage
} from "../js/showcase-manual-image.js";

const USER = "11111111-1111-4111-8111-111111111111";
const BASE = "https://koprmbkoftuuffslhsvt.supabase.co/storage/v1/object/public/character-images";

test("only JPEG / PNG / WebP up to 1MB can be uploaded", () => {
  assert.equal(validateManualImage({ type: "image/png", size: 10 }), "");
  assert.equal(validateManualImage({ type: "image/jpeg", size: MANUAL_IMAGE_MAX_BYTES }), "");
  assert.equal(validateManualImage({ type: "image/webp", size: 1 }), "");
  assert.match(validateManualImage({ type: "image/gif", size: 10 }), /JPEG \/ PNG \/ WebP/);
  assert.match(validateManualImage({ type: "image/png", size: MANUAL_IMAGE_MAX_BYTES + 1 }), /1MB以下/);
  assert.match(validateManualImage(null), /画像を選んでください/);
});

test("the path is below the user's own folder, in act-manual, with the extension of the type", () => {
  assert.equal(manualImagePath(USER, { type: "image/png" }, "abc"), `${USER}/act-manual/abc.png`);
  assert.equal(manualImagePath(USER, { type: "image/webp" }, "abc"), `${USER}/act-manual/abc.webp`);
  assert.equal(manualImagePath(USER, { type: "image/jpeg" }, "abc"), `${USER}/act-manual/abc.jpg`);
});

test("a path is taken from a public URL only for this user's manual-cast pictures", () => {
  assert.equal(manualImagePathFromUrl(`${BASE}/${USER}/act-manual/abc.png`, USER), `${USER}/act-manual/abc.png`);
  assert.equal(manualImagePathFromUrl(`${BASE}/${USER}/act-manual/abc.png?v=2`, USER), `${USER}/act-manual/abc.png`);
  // not a manual picture: a guest's, a registered cast's, another user's, an external URL, a bare folder, a nested path
  assert.equal(manualImagePathFromUrl(`${BASE}/${USER}/act-guests/abc.png`, USER), "");
  assert.equal(manualImagePathFromUrl(`${BASE}/${USER}/TNX-CAST01/1.webp`, USER), "");
  assert.equal(manualImagePathFromUrl(`${BASE}/22222222-2222-4222-8222-222222222222/act-manual/abc.png`, USER), "");
  assert.equal(manualImagePathFromUrl("https://example.invalid/act-manual/abc.png", USER), "");
  assert.equal(manualImagePathFromUrl(`${BASE}/${USER}/act-manual/`, USER), "");
  assert.equal(manualImagePathFromUrl(`${BASE}/${USER}/act-manual/x/abc.png`, USER), "");
  assert.equal(manualImagePathFromUrl("", USER), "");
  assert.equal(manualImagePathFromUrl("./assets/placeholders/scan-failed.webp", USER), "");
  assert.equal(manualImagePathFromUrl(`${BASE}/${USER}/act-manual/abc.png`, ""), "");
});

function fakeSupabase({ uploadError = null, removeError = null } = {}) {
  const calls = { uploads: [], removals: [] };
  return {
    calls,
    storage: {
      from(bucket) {
        assert.equal(bucket, MANUAL_IMAGE_BUCKET);
        return {
          async upload(path, file, options) { calls.uploads.push({ path, file, options }); return { error: uploadError }; },
          getPublicUrl(path) { return { data: { publicUrl: `${BASE}/${path}` } }; },
          async remove(paths) { calls.removals.push(paths); return { error: removeError }; }
        };
      }
    }
  };
}

test("an upload goes to the user's folder without overwriting and returns the public URL", async () => {
  const supabase = fakeSupabase();
  const file = { type: "image/png", size: 100 };
  const result = await uploadManualImage(supabase, USER, file, { id: "fixed" });
  assert.deepEqual(result, { path: `${USER}/act-manual/fixed.png`, url: `${BASE}/${USER}/act-manual/fixed.png` });
  assert.deepEqual(supabase.calls.uploads[0].options, { cacheControl: "31536000", upsert: false, contentType: "image/png" });
});

test("an upload that is not allowed or fails throws the sentence to show, and sends nothing when the file is refused", async () => {
  const supabase = fakeSupabase({ uploadError: { message: "boom" } });
  await assert.rejects(() => uploadManualImage(supabase, USER, { type: "image/gif", size: 1 }), /JPEG \/ PNG \/ WebP/);
  assert.equal(supabase.calls.uploads.length, 0);
  await assert.rejects(() => uploadManualImage(supabase, USER, { type: "image/png", size: 1 }), /画像を登録できませんでした。 boom/);
  await assert.rejects(() => uploadManualImage(supabase, "", { type: "image/png", size: 1 }), /ログイン情報/);
});

test("removing pictures is best effort and removes each path once", async () => {
  const supabase = fakeSupabase();
  assert.deepEqual(await removeManualImages(supabase, [`${USER}/act-manual/a.png`, `${USER}/act-manual/a.png`, "", null]), { removed: 1 });
  assert.deepEqual(supabase.calls.removals, [[`${USER}/act-manual/a.png`]]);
  assert.deepEqual(await removeManualImages(supabase, []), { removed: 0 });
  assert.equal(supabase.calls.removals.length, 1);
  const failing = fakeSupabase({ removeError: { message: "nope" } });
  const result = await removeManualImages(failing, [`${USER}/act-manual/a.png`]);
  assert.equal(result.removed, 0);
  assert.ok(result.error);
});

test("a picture uploaded in this session goes at once; a picture a published showcase shows waits for the next publication", () => {
  const ledger = createImageLedger();
  ledger.uploaded("u1");
  ledger.known("p1");
  assert.deepEqual(ledger.release("u1"), ["u1"], "never published: removed right away");
  assert.deepEqual(ledger.release("p1"), [], "published: kept for now");
  assert.deepEqual(ledger.release("unknown"), [], "not ours: never removed");
  assert.deepEqual(ledger.release(""), []);
  assert.deepEqual(ledger.snapshot(), { uploaded: [], published: ["p1"], retired: ["p1"] });
  // the next successful publication removes what was retired, but not what is still in use
  ledger.uploaded("u2");
  assert.deepEqual(ledger.published(["u2"]), ["p1"]);
  assert.deepEqual(ledger.snapshot(), { uploaded: [], published: ["u2"], retired: [] });
  // after that publication u2 is part of the published showcase: replacing it waits for the next one
  assert.deepEqual(ledger.release("u2"), []);
  assert.deepEqual(ledger.published([]), ["u2"]);
  assert.deepEqual(ledger.snapshot(), { uploaded: [], published: [], retired: [] });
});

test("a retired picture that is in use again at the publication is not removed", () => {
  const ledger = createImageLedger();
  ledger.known("p1");
  ledger.release("p1");
  assert.deepEqual(ledger.published(["p1"]), []);
});
