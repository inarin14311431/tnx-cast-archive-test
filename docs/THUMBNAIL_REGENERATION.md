# キャスト画像サムネイルの一括作り直し

サムネイルの生成仕様(長辺840px・WebP・目標120KB・上限200KB)は `js/image-thumbnail-config.js` が正本。
PC版(`js/sheet-image.js`)・スマホ版(`js/sheet-mobile-image.js`)・本スクリプトの3か所がここを読む。
仕様を変えたら、既存分も作り直す必要がある。

## 前提: updated_at を動かさないmigration(必須)

`characters` には BEFORE UPDATE トリガー `characters_set_updated_at` があり、**どの列を更新しても**
`updated_at` を現在時刻にする。そのため `image_thumbnail_url` だけを更新するこのスクリプトでも、
migration を適用していないDBでは対象行の `updated_at` がすべて実行時刻に書き換わり、一覧の更新順が
変わってしまう(2026-10-16 の本番実行で112件がこの状態になり、バックアップから復元した)。

`supabase/migrations/20261016_characters_updated_at_ignore_thumbnail.sql` は、`image_thumbnail_url` だけが
変わるUPDATEでは `updated_at` を動かさないようにする。ブラウザからの画像アップロードは `image_url` も
変わるので従来どおり更新される。それ以外のUPDATEの挙動は変わらない。

- **適用前にスクリプトを `--apply` で実行しない。** 実行すると `updated_at` が書き換わる。
- migration を実DBへ適用するには、別途オーナーの明示的な確認が必要(`docs/DATABASE_MIGRATIONS.md`)。
- 適用後の確認: `select pg_get_triggerdef(oid) from pg_trigger where tgrelid = 'public.characters'::regclass
  and tgname = 'characters_set_updated_at';` が `characters_touch_updated_at()` を呼ぶ定義になっていること。
- 戻すとき: migration 先頭コメントのロールバックSQL(トリガーを `public.set_updated_at()` に戻す)。

## 実行手順(オーナーがローカルで手動実行する一回限りの作業)

検証・本番は同一のSupabaseプロジェクトを共有するため、**実行は1回でよい**。ただし本番へ新しい
アップロード処理(840px)が反映される前に実行すると、反映までの間に作られた旧仕様(420px)の
サムネイルが残る。その場合は本番反映後にもう一度実行する(対象は何度でも上書きできる)。

```
npm install
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role key>"   # 履歴・ファイル・チャットに残さない
npm run thumbnails:regenerate -- --limit 3              # dry-run: 先頭3件の対象だけ表示
npm run thumbnails:regenerate -- --limit 3 --apply      # まず少数で書き込む
#   → 対象キャストの updated_at が変わっていないことを確認する(下記)
npm run thumbnails:regenerate                           # dry-run: 全件の件数と一覧
npm run thumbnails:regenerate -- --apply                # 全件
```

- 少数での確認: 実行前後で、対象 `public_id` の `updated_at` が同じであること(アーカイブ一覧の並びが
  変わっていないことでも確認できる)。変わっていたら全件を実行せず、migration の適用状況を確認する。
- `--limit N` は対象の先頭N件(`id` 順)に絞る。全件の実行では、少数で処理した行も作り直される
  (何度作り直しても害はない)。
- スクリプトは、更新した行の `updated_at` が更新前と変わったことを検知すると、旧サムネイルを消さずに
  残りの処理を止めて `public_id` を表示する(実行中の最大3件が先に進むことがある)。表示された行の
  `updated_at` はバックアップなどから戻すこと。
- 対象: `characters.image_url` が `character-images` バケットの公開URLのもの。外部URL・空はスキップ。
  `image_thumbnail_url` が空のものも対象。
- 元画像は `image_url` の `#` 以降(`tnx-focus-x` / `tnx-focus-y` / `tnx-zoom`)を除いて取得する。
- 新サムネイルは元画像と同じフォルダに `{timestamp}-thumb.webp` で保存し、DBは `image_thumbnail_url` だけ更新する。
  取得後に `image_url` が変わっていた行は更新せずスキップする。
- 旧サムネイルは、DB更新に成功した後、同じバケット・同じフォルダ配下のものだけ削除する。
- 失敗は1件ずつスキップして続行し、最後に成功/スキップ/失敗の件数と失敗した `public_id` を表示する。
  失敗が出たら、そのまま `--apply` を再実行してよい(処理済みも作り直されるだけで害はない)。
- service-role key はブラウザJSに入れない。このスクリプトはローカル実行専用。
