import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import {
  encodeThumbnail,
  folderOf,
  isSafeOldThumbnailPath,
  parseBucketPath,
  parseOriginalImagePath
} from "../scripts/regenerate-thumbnails.mjs";
import {
  THUMBNAIL_MAX_LONG_EDGE,
  THUMBNAIL_MAX_OUTPUT_FILE_SIZE,
  THUMBNAIL_TARGET_SIZE
} from "../js/image-thumbnail-config.js";

const SUPABASE_URL = "https://example.supabase.co";
const base = `${SUPABASE_URL}/storage/v1/object/public/character-images`;

test("parseOriginalImagePath strips the focus/zoom hash and resolves the bucket path", () => {
  assert.equal(
    parseOriginalImagePath(`${base}/owner-1/AB12/1700000000000.webp#tnx-focus-x=40&tnx-focus-y=20&tnx-zoom=1.5`, SUPABASE_URL),
    "owner-1/AB12/1700000000000.webp"
  );
});

test("external URLs, other buckets and empty values are not targets", () => {
  assert.equal(parseBucketPath("https://example.com/a.png", SUPABASE_URL), null);
  assert.equal(parseBucketPath(`${SUPABASE_URL}/storage/v1/object/public/other-bucket/o/p/a.webp`, SUPABASE_URL), null);
  assert.equal(parseBucketPath("", SUPABASE_URL), null);
  assert.equal(parseBucketPath(null, SUPABASE_URL), null);
  assert.equal(parseBucketPath(`${base}/o/../x.webp`, SUPABASE_URL), null);
  assert.equal(parseBucketPath(`https://evil.example/storage/v1/object/public/character-images/o/p/a.webp`, SUPABASE_URL), null);
});

test("old thumbnails are deleted only inside the original image's own folder", () => {
  const image = "owner-1/AB12/1700.webp";
  const next = "owner-1/AB12/1800-thumb.webp";
  assert.equal(folderOf(image), "owner-1/AB12");
  assert.equal(isSafeOldThumbnailPath("owner-1/AB12/1700-thumb.webp", image, next), true);
  assert.equal(isSafeOldThumbnailPath("owner-2/ZZ99/1700-thumb.webp", image, next), false);
  assert.equal(isSafeOldThumbnailPath("owner-1/AB12/sub/x.webp", image, next), false);
  assert.equal(isSafeOldThumbnailPath(image, image, next), false);
  assert.equal(isSafeOldThumbnailPath(next, image, next), false);
  assert.equal(isSafeOldThumbnailPath(null, image, next), false);
});

test("encodeThumbnail: large image -> WebP, long edge 840px, <= 120KB target", async () => {
  const noise = Buffer.alloc(2400 * 1800 * 3);
  for (let i = 0; i < noise.length; i += 1) noise[i] = (i * 31 + ((i >> 7) & 0xff)) & 0xff;
  const input = await sharp(noise, { raw: { width: 2400, height: 1800, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
  const result = await encodeThumbnail(input);
  const meta = await sharp(result.buffer).metadata();
  assert.equal(meta.format, "webp");
  assert.ok(Math.max(meta.width, meta.height) <= THUMBNAIL_MAX_LONG_EDGE);
  assert.ok(result.buffer.length <= THUMBNAIL_MAX_OUTPUT_FILE_SIZE);
});

test("encodeThumbnail: smooth 1200x2000 portrait keeps 840 long edge within target, no upscale of small images", async () => {
  const tall = await sharp({ create: { width: 1200, height: 2000, channels: 3, background: "#6a8" } }).png().toBuffer();
  const big = await encodeThumbnail(tall);
  assert.equal(Math.max(big.width, big.height), THUMBNAIL_MAX_LONG_EDGE);
  assert.ok(big.buffer.length <= THUMBNAIL_TARGET_SIZE);
  const small = await sharp({ create: { width: 300, height: 200, channels: 3, background: "#a68" } }).png().toBuffer();
  const kept = await encodeThumbnail(small);
  assert.deepEqual([kept.width, kept.height], [300, 200]);
});

test("encodeThumbnail applies EXIF orientation like the browser (landscape with Orientation 6 -> portrait)", async () => {
  const input = await sharp({ create: { width: 1600, height: 900, channels: 3, background: "#3a6" } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const result = await encodeThumbnail(input);
  assert.deepEqual([result.width, result.height], [473, 840]);
  const meta = await sharp(result.buffer).metadata();
  assert.deepEqual([meta.width, meta.height], [473, 840]);
});

test("the script never writes secrets and defaults to dry-run", async () => {
  const source = await readFile(new URL("../scripts/regenerate-thumbnails.mjs", import.meta.url), "utf8");
  assert.match(source, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(source, /eyJ[A-Za-z0-9_-]{20,}/);
  assert.match(source, /process\.argv\.includes\("--apply"\)/);
  assert.match(source, /\.update\(\{ image_thumbnail_url: newUrl \}\)/, "DB update must touch image_thumbnail_url only");
  assert.equal((source.match(/\.update\(/g) || []).length, 1);
});
