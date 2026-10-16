# キャスト画像サムネイルの一括作り直し

サムネイルの生成仕様(長辺840px・WebP・目標120KB・上限200KB)は `js/image-thumbnail-config.js` が正本。
PC版(`js/sheet-image.js`)・スマホ版(`js/sheet-mobile-image.js`)・本スクリプトの3か所がここを読む。
仕様を変えたら、既存分も作り直す必要がある。

## 実行手順(オーナーがローカルで手動実行する一回限りの作業)

検証・本番は同一のSupabaseプロジェクトを共有するため、**実行は1回でよい**。ただし本番へ新しい
アップロード処理(840px)が反映される前に実行すると、反映までの間に作られた旧仕様(420px)の
サムネイルが残る。その場合は本番反映後にもう一度実行する(対象は何度でも上書きできる)。

```
npm install
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role key>"   # 履歴・ファイル・チャットに残さない
npm run thumbnails:regenerate               # dry-run: 対象件数と一覧だけ表示
npm run thumbnails:regenerate -- --apply    # 実際に書き込む
```

- 対象: `characters.image_url` が `character-images` バケットの公開URLのもの。外部URL・空はスキップ。
  `image_thumbnail_url` が空のものも対象。
- 元画像は `image_url` の `#` 以降(`tnx-focus-x` / `tnx-focus-y` / `tnx-zoom`)を除いて取得する。
- 新サムネイルは元画像と同じフォルダに `{timestamp}-thumb.webp` で保存し、DBは `image_thumbnail_url` だけ更新する
  (`updated_at` など他の列は変えない)。取得後に `image_url` が変わっていた行は更新せずスキップする。
- 旧サムネイルは、DB更新に成功した後、同じバケット・同じフォルダ配下のものだけ削除する。
- 失敗は1件ずつスキップして続行し、最後に成功/スキップ/失敗の件数と失敗した `public_id` を表示する。
  失敗が出たら、そのまま `--apply` を再実行してよい(処理済みも作り直されるだけで害はない)。
- service-role key はブラウザJSに入れない。このスクリプトはローカル実行専用。
