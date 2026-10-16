// 既存キャスト画像サムネイルの一括作り直し(オーナーがローカルで手動実行する一回限りの管理用ツール)。
// 使い方は docs/THUMBNAIL_REGENERATION.md。既定は dry-run、--apply で書き込む。--limit N で対象を先頭N件に絞る。
// 接続情報は環境変数 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY から読む(ブラウザJSには入れない)。
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import {
  THUMBNAIL_MAX_LONG_EDGE,
  THUMBNAIL_MIN_LONG_EDGE,
  THUMBNAIL_TARGET_SIZE,
  THUMBNAIL_MAX_OUTPUT_FILE_SIZE,
  THUMBNAIL_QUALITY_STEPS,
  THUMBNAIL_SHRINK_STEP
} from "../js/image-thumbnail-config.js";

const BUCKET = "character-images";
const PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/`;
const CONCURRENCY = 3;
const PAGE_SIZE = 500;

// 公開URLから character-images 内のオブジェクトパスを取り出す。バケット外・外部URL・空は null。
export function parseBucketPath(url, supabaseUrl) {
  if (!url || typeof url !== "string") return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.origin !== new URL(supabaseUrl).origin) return null;
  if (!parsed.pathname.startsWith(PUBLIC_PREFIX)) return null;
  let objectPath;
  try {
    objectPath = decodeURIComponent(parsed.pathname.slice(PUBLIC_PREFIX.length));
  } catch {
    return null;
  }
  const segments = objectPath.split("/");
  if (segments.length < 2 || segments.some(segment => !segment || segment === "." || segment === "..")) return null;
  return objectPath;
}

// #tnx-focus-x / tnx-focus-y / tnx-zoom を取り除いた元画像のパス。
export function parseOriginalImagePath(imageUrl, supabaseUrl) {
  return parseBucketPath(typeof imageUrl === "string" ? imageUrl.split("#")[0] : imageUrl, supabaseUrl);
}

export function folderOf(objectPath) {
  return objectPath.slice(0, objectPath.lastIndexOf("/"));
}

// --limit N / --limit=N を読む。指定なしは null、不正な値は例外。
export function parseLimit(argv) {
  const index = argv.findIndex(arg => arg === "--limit" || arg.startsWith("--limit="));
  if (index === -1) return null;
  const raw = argv[index] === "--limit" ? argv[index + 1] : argv[index].slice("--limit=".length);
  if (!/^[1-9]\d*$/.test(raw ?? "")) throw new Error("--limit には1以上の整数を指定してください。");
  return Number(raw);
}

// 旧サムネイルを消してよいのは、同じバケット内かつ元画像と同じフォルダ配下のファイルだけ。
export function isSafeOldThumbnailPath(oldPath, imagePath, newPath) {
  if (!oldPath || oldPath === newPath || oldPath === imagePath) return false;
  return oldPath.startsWith(`${folderOf(imagePath)}/`) && !oldPath.slice(folderOf(imagePath).length + 1).includes("/");
}

// ブラウザ版 createThumbnail と同じ仕様: 長辺 THUMBNAIL_MAX_LONG_EDGE、WebP、品質を下げて目標容量、超過なら 0.86 倍で縮小。
export async function encodeThumbnail(input) {
  const base = sharp(input, { failOn: "none" }).rotate();
  const meta = await base.clone().metadata();
  // EXIF の向き 5〜8 は縦横が入れ替わる(ブラウザは向きを適用して描画するため、同じ寸法で扱う)。
  const swapped = meta.orientation >= 5;
  const sourceWidth = swapped ? meta.height : meta.width;
  const sourceHeight = swapped ? meta.width : meta.height;
  if (!sourceWidth || !sourceHeight) throw new Error("画像サイズを確認できませんでした");
  const initialScale = Math.min(1, THUMBNAIL_MAX_LONG_EDGE / Math.max(sourceWidth, sourceHeight));
  let width = Math.max(1, Math.round(sourceWidth * initialScale));
  let height = Math.max(1, Math.round(sourceHeight * initialScale));
  let smallest = null;
  let target = null;
  for (let pass = 0; pass < 6; pass += 1) {
    const resized = await base.clone().resize(width, height, { fit: "fill" }).toBuffer();
    for (const quality of THUMBNAIL_QUALITY_STEPS) {
      const buffer = await sharp(resized).webp({ quality: Math.round(quality * 100) }).toBuffer();
      const candidate = { buffer, width, height };
      if (!smallest || buffer.length < smallest.buffer.length) smallest = candidate;
      if (buffer.length <= THUMBNAIL_TARGET_SIZE) {
        target = candidate;
        break;
      }
    }
    if (target) break;
    const longEdge = Math.max(width, height);
    if (longEdge <= THUMBNAIL_MIN_LONG_EDGE) break;
    const scale = Math.max(THUMBNAIL_MIN_LONG_EDGE / longEdge, THUMBNAIL_SHRINK_STEP);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }
  const selected = target || smallest;
  if (!selected) throw new Error("サムネイルを生成できませんでした");
  if (selected.buffer.length > THUMBNAIL_MAX_OUTPUT_FILE_SIZE) throw new Error("サムネイルを十分に圧縮できませんでした");
  return selected;
}

async function listTargets(client, supabaseUrl) {
  const targets = [];
  let skippedExternal = 0;
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from("characters")
      .select("id,public_id,owner_id,image_url,image_thumbnail_url,updated_at")
      .neq("image_url", "")
      .not("image_url", "is", null)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    for (const row of data) {
      const imagePath = parseOriginalImagePath(row.image_url, supabaseUrl);
      if (!imagePath) {
        skippedExternal += 1;
        continue;
      }
      targets.push({ ...row, imagePath });
    }
    if (data.length < PAGE_SIZE) break;
  }
  return { targets, skippedExternal };
}

async function regenerateOne(client, supabaseUrl, row) {
  const download = await client.storage.from(BUCKET).download(row.imagePath);
  if (download.error) throw download.error;
  const original = Buffer.from(await download.data.arrayBuffer());
  const thumbnail = await encodeThumbnail(original);
  const newPath = `${folderOf(row.imagePath)}/${Date.now()}-thumb.webp`;
  const upload = await client.storage
    .from(BUCKET)
    .upload(newPath, thumbnail.buffer, { cacheControl: "86400", contentType: "image/webp", upsert: false });
  if (upload.error) throw upload.error;
  const newUrl = client.storage.from(BUCKET).getPublicUrl(newPath).data.publicUrl;
  // image_url が変わっていない行だけ更新する(取得後に画像が差し替えられた場合に上書きしない)。updated_at など他の列は触らない。
  const update = await client
    .from("characters")
    .update({ image_thumbnail_url: newUrl })
    .eq("id", row.id)
    .eq("image_url", row.image_url)
    .select("id,updated_at");
  if (update.error || !update.data?.length) {
    await client.storage.from(BUCKET).remove([newPath]);
    if (update.error) throw update.error;
    return "skipped";
  }
  // updated_at が動いたら(DBトリガーが image_thumbnail_url の更新でも updated_at を書き換える場合)、
  // 旧サムネイルは消さずに知らせて止める。docs/THUMBNAIL_REGENERATION.md の前提migrationを参照。
  if (new Date(update.data[0].updated_at).getTime() !== new Date(row.updated_at).getTime()) {
    return "updated_at_changed";
  }
  const oldPath = parseBucketPath(row.image_thumbnail_url, supabaseUrl);
  if (isSafeOldThumbnailPath(oldPath, row.imagePath, newPath)) {
    const removal = await client.storage.from(BUCKET).remove([oldPath]);
    if (removal.error) console.warn(`旧サムネイル削除に失敗(DB更新は成功済み) ${row.public_id}: ${removal.error.message}`);
  }
  return "ok";
}

async function runPool(items, worker) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (cursor < items.length) {
        const item = items[cursor++];
        await worker(item);
      }
    })
  );
}

async function main() {
  const apply = process.argv.includes("--apply");
  const limit = parseLimit(process.argv.slice(2));
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("環境変数 SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください。");
    process.exit(2);
  }
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const listed = await listTargets(client, supabaseUrl);
  const { skippedExternal } = listed;
  const targets = limit ? listed.targets.slice(0, limit) : listed.targets;
  const limitNote = limit ? `(--limit ${limit}、全体 ${listed.targets.length} 件のうち先頭)` : "";
  console.log(`${apply ? "APPLY" : "DRY-RUN"}: 対象 ${targets.length} 件${limitNote} / 対象外(外部URL・バケット外) ${skippedExternal} 件`);
  if (!apply) {
    for (const row of targets) console.log(`${row.public_id}\t${row.imagePath}\t${row.image_thumbnail_url ? "thumb:あり" : "thumb:なし"}`);
    console.log("書き込むには --apply を付けて再実行してください。");
    return;
  }
  const counts = { ok: 0, skipped: 0, failed: 0 };
  const failedIds = [];
  const changedIds = [];
  await runPool(targets, async row => {
    if (changedIds.length) return;
    try {
      const result = await regenerateOne(client, supabaseUrl, row);
      if (result === "updated_at_changed") {
        changedIds.push(row.public_id);
        return;
      }
      counts[result] += 1;
    } catch (error) {
      counts.failed += 1;
      failedIds.push(row.public_id);
      console.error(`失敗 ${row.public_id}: ${error?.message || error}`);
    }
  });
  console.log(`完了: 成功 ${counts.ok} / スキップ ${counts.skipped + skippedExternal} / 失敗 ${counts.failed}`);
  if (failedIds.length) console.log(`失敗した public_id: ${failedIds.join(", ")}`);
  if (changedIds.length) {
    console.error(`中止: updated_at が変わりました(${changedIds.join(", ")})。残りは処理していません。`);
    console.error("DBトリガーが image_thumbnail_url の更新でも updated_at を書き換えています。docs/THUMBNAIL_REGENERATION.md の前提(migration 20261016)を確認してください。");
    process.exitCode = 1;
  }
  if (counts.failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error?.message || error);
    process.exit(1);
  });
}
