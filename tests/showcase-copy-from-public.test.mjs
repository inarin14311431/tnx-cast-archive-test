import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  parseCopySource, copyDraftSlug, isCopySourceSlug, planCopiedCasts, splitSavedFullName, guestFromPublicRow, sortedGuestRows,
  copyImageToOwnStorage, isPlaceholderImage
} from "../js/showcase-copy-source.js";
import { uploadManualImage, manualImagePathFromUrl, GUEST_IMAGE_FOLDER } from "../js/showcase-manual-image.js";
import { obfuscatePublicId } from "../js/showcase-restore-matching.js";
import { assertVersionedMatch } from "./helpers/cache-version.mjs";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const ME = "11111111-1111-4111-8111-111111111111";
const AUTHOR = "22222222-2222-4222-8222-222222222222";
const STORAGE = "https://example.supabase.co/storage/v1/object/public/character-images/";

const deepFreeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
};

function fakeSupabase() {
  const uploads = [];
  const storage = {
    from: bucket => ({
      upload: async (path, file, options) => { uploads.push({ bucket, path, file, options }); return { error: null }; },
      getPublicUrl: path => ({ data: { publicUrl: `${STORAGE}${path}` } })
    })
  };
  return { storage, uploads };
}

const okResponse = (type = "image/webp", size = 2048) => ({ ok: true, status: 200, blob: async () => new Blob([new Uint8Array(size)], { type }) });

test("the source is a public URL (cinematic or standard) or a slug", () => {
  assert.equal(parseCopySource("https://inarin.example/tnx/act-showcase.html?id=act-0012"), "act-0012");
  assert.equal(parseCopySource("https://inarin.example/tnx/act-showcase-standard.html?id=Act-0012&theme=nova"), "act-0012");
  assert.equal(parseCopySource("./act-showcase.html?id=neon-afterimage"), "neon-afterimage");
  assert.equal(parseCopySource("  act-0007 "), "act-0007");
  assert.equal(parseCopySource("https://inarin.example/tnx/act-showcase.html"), "");
  assert.equal(parseCopySource("アクト名"), "");
  assert.equal(parseCopySource(""), "");
});

test("the draft slug is the next automatic number and is never the source's", () => {
  assert.equal(copyDraftSlug([{ slug: "act-0001" }], "act-0005"), "act-0006");
  assert.equal(copyDraftSlug([{ slug: "act-0009" }], "act-0005"), "act-0010");
  assert.equal(copyDraftSlug([], "act-0001"), "act-0002");
  assert.equal(copyDraftSlug(null, "neon-afterimage"), "act-0001");
  for (const source of ["act-0001", "act-0042", "neon", "act-9"]) {
    for (const rows of [[], [{ slug: "act-0001" }], [{ slug: source }], [{ slug: "act-0100" }]]) {
      assert.notEqual(copyDraftSlug(rows, source), source, `${source} / ${JSON.stringify(rows)}`);
    }
  }
  assert.equal(isCopySourceSlug(" ACT-0005 ", "act-0005"), true);
  assert.equal(isCopySourceSlug("act-0006", "act-0005"), false);
  assert.equal(isCopySourceSlug("act-0005", ""), false);
});

test("publishing the copy leaves the source's slug and data as they were", () => {
  // A small model of the acts table and of the publish rules: record_act_history_for_current_user refuses another user's slug,
  // and the page refuses the source's slug before anything is sent (which also covers copying one's own showcase).
  const source = deepFreeze({ slug: "act-0005", owner: AUTHOR, data: { actName: "NEON", casts: [{ fullName: "“A” 甲", serial: "ScanFailed", imageUrl: `${STORAGE}${AUTHOR}/act-manual/a.webp` }] } });
  const acts = new Map([[source.slug, source]]);
  const before = structuredClone(source);
  const publish = (user, slug, data) => {
    const existing = acts.get(slug);
    if (existing && existing.owner !== user) throw new Error("This act slug is owned by another user.");
    acts.set(slug, { slug, owner: user, data });
  };
  const draftSlug = copyDraftSlug([{ slug: "act-0001" }], source.slug);
  const pageAllows = slug => !isCopySourceSlug(slug, source.slug);

  assert.equal(pageAllows(draftSlug), true);
  publish(ME, draftSlug, { ...source.data, actName: "NEON (copy)" });
  assert.deepEqual(acts.get(source.slug), before);
  assert.equal(acts.get(draftSlug).owner, ME);
  // the writer types the source's slug back in: the page stops it, and the server would refuse it as well
  assert.equal(pageAllows("act-0005"), false);
  assert.throws(() => publish(ME, "act-0005", {}), /owned by another user/);
  assert.deepEqual(acts.get(source.slug), before);
});

test("registered casts are referred to, manual ones copied, and the unreachable ones named", () => {
  const publicCast = { id: "c-1", public_id: "TNX-000001", owner_id: AUTHOR };
  const mine = { id: "c-2", public_id: "TNX-000002", owner_id: ME };
  const myPrivate = { id: "c-3", public_id: "TNX-000003", owner_id: ME };
  const casts = deepFreeze([
    { fullName: "“A” 公開", serial: obfuscatePublicId("TNX-000001") },
    { fullName: "“B” 自分の公開", serial: obfuscatePublicId("TNX-000002") },
    { fullName: "“C” 手動", serial: "ScanFailed" },
    { fullName: "“D” 古いデータの手動", serial: "PRIVATE" },
    { fullName: "“E” 非公開になった", serial: obfuscatePublicId("TNX-000099") },
    { fullName: "“F” 自分の非公開", serial: obfuscatePublicId("TNX-000003") }
  ]);
  const { entries, skipped } = planCopiedCasts(casts, { publicCharacters: [publicCast, mine], ownPrivateCharacters: [myPrivate] });
  assert.deepEqual(entries.map(entry => [entry.kind, entry.character?.id ?? null, entry.cast.fullName]), [
    ["public", "c-1", "“A” 公開"],
    ["public", "c-2", "“B” 自分の公開"],
    ["manual", null, "“C” 手動"],
    ["manual", null, "“D” 古いデータの手動"],
    ["private", "c-3", "“F” 自分の非公開"]
  ]);
  assert.deepEqual(skipped.map(entry => [entry.name, entry.reason]), [["“E” 非公開になった", "unavailable"]]);
});

test("a manual cast's picture is copied under the copier's own folder", async () => {
  const supabase = fakeSupabase();
  const sourceUrl = `${STORAGE}${AUTHOR}/act-manual/source.webp`;
  const fetched = [];
  const copy = await copyImageToOwnStorage(sourceUrl, {
    fetchImpl: async url => { fetched.push(url); return okResponse(); },
    upload: file => uploadManualImage(supabase, ME, file)
  });
  assert.deepEqual(fetched, [sourceUrl]);
  assert.notEqual(copy.url, sourceUrl);
  assert.match(copy.path, new RegExp(`^${ME}/act-manual/[^/]+\\.webp$`));
  assert.equal(copy.url, `${STORAGE}${copy.path}`);
  assert.equal(manualImagePathFromUrl(copy.url, ME), copy.path);
  assert.equal(manualImagePathFromUrl(sourceUrl, ME), "");
  assert.deepEqual(supabase.uploads.map(item => [item.bucket, item.options.upsert]), [["character-images", false]]);

  const guest = await copyImageToOwnStorage(`${STORAGE}${AUTHOR}/act-guests/g.png`, {
    fetchImpl: async () => okResponse("image/png"),
    upload: file => uploadManualImage(supabase, ME, file, { folder: GUEST_IMAGE_FOLDER })
  });
  assert.match(guest.path, new RegExp(`^${ME}/act-guests/[^/]+\\.png$`));
});

test("no picture, a placeholder, or a picture that cannot be fetched or is too large", async () => {
  const upload = () => { throw new Error("must not upload"); };
  assert.equal(await copyImageToOwnStorage("", { upload }), null);
  assert.equal(await copyImageToOwnStorage("https://x.example/assets/placeholders/scan-failed.webp", { upload }), null);
  assert.equal(isPlaceholderImage("./assets/placeholders/scan-failed.webp?v=1"), true);
  await assert.rejects(copyImageToOwnStorage("https://x.example/a.png", { fetchImpl: async () => ({ ok: false, status: 404 }), upload }), /404/);
  const supabase = fakeSupabase();
  await assert.rejects(copyImageToOwnStorage("https://x.example/big.png", {
    fetchImpl: async () => okResponse("image/png", 1024 * 1024 + 1),
    upload: file => uploadManualImage(supabase, ME, file)
  }), /1MB/);
  assert.equal(supabase.uploads.length, 0);
});

test("names and guests come over as the editor's fields", () => {
  assert.deepEqual(splitSavedFullName("“Instant Fire” 大文字 炎十朗"), { handle: "Instant Fire", name: "大文字 炎十朗" });
  assert.deepEqual(splitSavedFullName("ワンズ"), { handle: "", name: "ワンズ" });
  const rows = sortedGuestRows([{ sort_order: 2, name: "B" }, { sort_order: 1, name: "A", handle: "h", persona_style: "カブト", image_url: `${STORAGE}${AUTHOR}/act-guests/a.png` }]);
  assert.deepEqual(rows.map(row => row.name), ["A", "B"]);
  assert.deepEqual(guestFromPublicRow(rows[0]), {
    handle: "h", name: "A", personaStyle: "カブト", affiliation: "", gender: "", age: "", tagline: "", summary: "",
    sourceImageUrl: `${STORAGE}${AUTHOR}/act-guests/a.png`
  });
  assert.equal(guestFromPublicRow(rows[1]).sourceImageUrl, "");
});

test("the page reads only public data and never writes to the source", async () => {
  const page = await read("js/showcase-copy-from-public.js");
  assert.match(page, /loadPublicShowcase\(sourceSlug\)/);
  assert.match(page, /loadPublicShowcaseGuests\(sourceSlug\)/);
  assert.doesNotMatch(page, /\.(update|upsert|insert|delete)\(|\.rpc\(|storage\.from/);
  // the only removal is of a picture this copy itself just uploaded
  assert.deepEqual(page.match(/removeManualImages\([^)]*\)/g), ["removeManualImages(supabase, [picture.path])"]);
  // the draft is never announced as a restored (owned, republishable) act, and the source's slug is guarded before the document listeners
  assert.doesNotMatch(page, /tnx:showcase-restored"\)\)|new CustomEvent\("tnx:showcase-restored"/);
  assert.match(page, /window\.addEventListener\("click", guardSourceSlug, true\)/);
  assert.match(page, /copyDraftSlug\(/);

  const loader = await read("js/showcase-generator-loader.js");
  assertVersionedMatch(loader, /await import\("\.\/showcase-edit-restore\.js\?v=VERSION"\);\s*\/\/[^\n]*\n\s*await import\("\.\/showcase-copy-from-public\.js\?v=VERSION"\)/);
  const restoreVersion = /showcase-edit-restore\.js\?v=([0-9a-f]+)/.exec(loader)?.[1];
  assert.ok(restoreVersion && page.includes(`showcase-edit-restore.js?v=${restoreVersion}`), "the copy uses the same restore module instance as the loader");

  const html = await read("showcase-generator.html");
  assert.match(html, /公開中のアクト紹介からコピー <small>COPY PUBLIC SHOWCASE<\/small>/);
  assert.match(html, /id="copy-showcase-source"/);
  assert.match(html, /id="load-copy-showcase"[^>]*disabled>読み込む <small>COPY TO NEW DRAFT<\/small>/);
});

test("the generator and the guests take the copy through events, as this session's uploads", async () => {
  const generator = await read("js/showcase-generator-v3.js");
  assert.match(generator, /"tnx:showcase-copied-images"[\s\S]{0,120}imageLedger\.uploaded\(path\)/);
  assert.match(generator, /"tnx:showcase-select-archive-cast"/);
  assert.match(generator, /"tnx:showcase-library-request"/);
  const guests = await read("js/showcase-guests.js");
  assert.match(guests, /"tnx:showcase-guests-replace"/);
  assert.match(guests, /if \(dirty && !startedDirty\) return;/);
});
