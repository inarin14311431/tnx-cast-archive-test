import test from "node:test";
import assert from "node:assert/strict";
import { toThumbnailUrl } from "../js/image-focus.js";

const OBJECT_URL = "https://koprmbkoftuuffslhsvt.supabase.co/storage/v1/object/public/character-images/abc.webp";
const RENDER_BASE = "https://koprmbkoftuuffslhsvt.supabase.co/storage/v1/render/image/public/character-images/abc.webp";

test("Supabase Storageの公開URLをrender/imageエンドポイントへ変換する", () => {
  const result = toThumbnailUrl(OBJECT_URL);
  const url = new URL(result);
  assert.equal(`${url.origin}${url.pathname}`, RENDER_BASE);
  assert.equal(url.searchParams.get("width"), "420");
  assert.equal(url.searchParams.get("height"), "2000");
  assert.equal(url.searchParams.get("resize"), "contain");
  assert.equal(url.searchParams.get("quality"), "70");
});

test("widthとheightを指定した場合はそれを反映する", () => {
  const result = toThumbnailUrl(OBJECT_URL, { width: 200, height: 250 });
  const url = new URL(result);
  assert.equal(url.searchParams.get("width"), "200");
  assert.equal(url.searchParams.get("height"), "250");
});

test("フォーカス位置用のURLフラグメントを変換後URLにも保持する", () => {
  const result = toThumbnailUrl(`${OBJECT_URL}#tnx-focus-x=30&tnx-focus-y=70`);
  const [beforeHash, hash] = result.split("#");
  assert.equal(hash, "tnx-focus-x=30&tnx-focus-y=70");
  const url = new URL(beforeHash);
  assert.equal(`${url.origin}${url.pathname}`, RENDER_BASE);
});

test("Supabase Storageの公開URLでないローカルパスは変換せずそのまま返す", () => {
  assert.equal(toThumbnailUrl("./assets/placeholders/scan-failed.webp"), "./assets/placeholders/scan-failed.webp");
});

test("フラグメント付きのローカルパスも変換せずそのまま返す", () => {
  const localWithHash = "./assets/placeholders/scan-failed.webp#tnx-focus-x=10";
  assert.equal(toThumbnailUrl(localWithHash), localWithHash);
});

test("空・null・undefinedの入力に対しても例外を投げない", () => {
  assert.equal(toThumbnailUrl(""), "");
  assert.equal(toThumbnailUrl(null), null);
  assert.equal(toThumbnailUrl(undefined), undefined);
});

test("既にクエリパラメータを持つURLでも壊れずマージされる", () => {
  const withQuery = `${OBJECT_URL}?token=abc123`;
  const result = toThumbnailUrl(withQuery);
  const url = new URL(result);
  assert.equal(`${url.origin}${url.pathname}`, RENDER_BASE);
  assert.equal(url.searchParams.get("token"), "abc123");
  assert.equal(url.searchParams.get("width"), "420");
  assert.equal(url.searchParams.get("height"), "2000");
  assert.equal(url.searchParams.get("resize"), "contain");
  assert.equal(url.searchParams.get("quality"), "70");
});

test("既存クエリとフラグメントの両方があっても正しく変換・保持する", () => {
  const withQueryAndHash = `${OBJECT_URL}?token=abc123#tnx-focus-x=30`;
  const result = toThumbnailUrl(withQueryAndHash);
  const [beforeHash, hash] = result.split("#");
  assert.equal(hash, "tnx-focus-x=30");
  const url = new URL(beforeHash);
  assert.equal(`${url.origin}${url.pathname}`, RENDER_BASE);
  assert.equal(url.searchParams.get("token"), "abc123");
  assert.equal(url.searchParams.get("width"), "420");
});
