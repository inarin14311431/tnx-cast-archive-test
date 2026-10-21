# 現在地 / Current State

最終更新: 2026-10-21

AIや新規担当者が「何が完了済みで、何が途中か」を誤認しないためのスナップショット。時点情報
なので、作業再開時はGitHub上のmain/PR/branchを再確認すること。固定のSHAやPR番号はこの資料にだけ置く。

## 1. Runtime同期基準点

- 検証repo main: `7713ec8`(PR #599 マージ点, 2026-10-21)。画面比較の基準ブランチ
  `visual-regression-baseline` は `28fa7ae`(revert #571 のマージ点)。中身は `d550978`(PR #538 マージ点)と
  同一で、Playwright 1.62.1 時代の基準画像のまま(1.64 への更新は見送り。`docs/TESTING_STRATEGY.md` 第8節)。
- 本番repo main: `790ecab`(同期PR #226 マージ点, 2026-10-21)。検証 #599 までのruntimeとmigrationを同期済み。
  同期前に、本番の対象ファイルが検証の直前の内容と一致することを実ファイルで確認してからコピーした
  (#216: 検証 `1c83520` の対象2ファイル、#219: 検証 `34f7cbd` の7ファイル、#220: 削除する4ファイル、#221〜#225: それぞれ直前の検証mainの対象ファイル)。
- 未同期のruntime: なし。
- DB: migration `20261016_characters_updated_at_ignore_thumbnail.sql` は**適用済み**(2026-10-16、共有DB
  `koprmbkoftuuffslhsvt`)。`characters.updated_at` を、`image_thumbnail_url` だけが変わるUPDATEでは動かさない。
  適用後に、トリガー `characters_set_updated_at` が `characters_touch_updated_at()` を呼ぶ定義になっていること、
  トランザクション内で `image_thumbnail_url` だけを更新しても `updated_at` が変わらないこと(他の更新では変わること)を
  確認し、rollbackした。`supabase_migrations` の履歴テーブルには記録されていない(適用は `apply_migration` が
  タイムアウトしたため、同じDDLを `execute_sql` で個別に実行した。トリガーの付け替えだけは `drop trigger` の代わりに
  `create or replace trigger`。結果の定義は同じ)。ロールバックはmigration先頭のコメント。
- DB: migration `20261017_restore_snapshot_via_ofc_save.sql` は**適用済み**(2026-10-17、共有DB
  `koprmbkoftuuffslhsvt`)。`restore_character_snapshot` が `save_character_bundle_with_ofc` 経由になり、復元で
  `character_sheet_url` と `ofc_details` が戻る(`character_sheet_url` キーのない古いスナップショットは現在のURLを維持)。
  適用後に、関数が `save_character_bundle_with_ofc` を呼ぶ定義であること、`security invoker`・search_path・ACL
  (authenticated / service_role)が変わっていないことを確認した。`supabase_migrations` の履歴テーブルには記録されていない
  (`execute_sql` で同じDDLを実行した)。復元の実データでの動作確認はしていない(ライブのスナップショットを復元すると
  キャラクターを上書きするため)。ロールバックは `supabase/11_character_snapshots.sql` の旧本体を再作成。
- DB: migration `20261017_act_participant_cast_orders.sql` は**適用済み**(2026-10-17、共有DB
  `koprmbkoftuuffslhsvt`、`apply_migration`)。`set_act_participant_cast_orders_for_current_user(text, jsonb)` を追加
  (security definer、作成者本人のアクトの `act_participants.cast_order` だけ更新、anon不可を確認)。既存データは
  `20261017anoyuuhi` の1行(CAST 01→02)だけを個別に修正した。「履歴のみ登録」の過去分は正しい番号が残っていないため
  未修正(再登録で直る)。ロールバックはmigration先頭のコメント。
- DB: migration `20261020_unlisted_bundle_troops_public_and_rls_initplan.sql` は**適用済み**(2026-10-20、共有DB
  `koprmbkoftuuffslhsvt`、`apply_migration`。`supabase_migrations` に記録済み)。`get_unlisted_character_bundle` の
  troops を `visibility = 'public'` のものだけにし、advisor `auth_rls_initplan` の35件を `ALTER POLICY` で
  `(select auth.uid())` に書き換えた(条件の意味は不変)。適用後に次を確認した: advisor `auth_rls_initplan` が0件、
  書き換え前の `auth.uid()` が残るポリシーが0件、関数に troops の公開条件が入っていて security definer・anon
  実行権限が変わっていないこと、anon で読めるのは公開キャスト82件のみで非公開キャストの技能は0件、一般ユーザーは
  自分のキャストと公開キャストを読め他人のスナップショットは0件。ロールバックはmigration先頭のコメント。
  本番repoへのmigration・manifestの同期は本番 #218(下記)で済んでいる。
- DB: migration `20261021_drop_migration_backup_schemas.sql` は**適用済み**(2026-10-21、共有DB `koprmbkoftuuffslhsvt`)。
  ロールバック用のバックアップ(`internal_archive` の2表、`migration_backup_20260901` の2表と関数 `parse_legacy_style_detail`)を
  個別に drop し、空を確かめてから両スキーマを drop した。**削除は元に戻せない(ロールバック不可)**。
  - 適用の経緯: 利用者が Supabase SQL Editor で修正後のSQLを実行した。`apply_migration` は破壊的操作の確認に応答できず
    タイムアウト/キャンセルになったため。`supabase_migrations` の履歴テーブルには記録されていない。
  - 1回目は `DO` ブロックの `c.relkind`(`"char"` 型)が `text || "char"` で演算子が一意に決まらず 42725 で失敗し、トランザクション
    ごと取り消された(DBは変化なし)。`c.relkind::text` に直して適用した。repo のファイルは、適用した内容に合わせて直してある
    (検証の修正PRと本番 #227)。
  - 適用後の確認: 両スキーマが消えた。`public` の件数は適用前と同じ(characters 163 / character_skills 4,023 /
    character_outfits 1,351 / character_snapshots 28)。advisor の `no_primary_key` 4件が解消した(消えたバックアップ表の分)。
- 既存サムネイルの作り直し: 全112件を完了(2026-10-16)。最初の実行(migration適用前)で `updated_at` が書き換わったが、
  バックアップから復元済み。再実行は不要。以後 `scripts/regenerate-thumbnails.mjs` を使うときは
  `docs/THUMBNAIL_REGENERATION.md` の手順(`--limit` で少数から)に従う。
- 同期していないツール類: 検証にだけある `scripts/regenerate-thumbnails.mjs`(`npm run thumbnails:regenerate`)と
  その devDependencies(`sharp`・`@supabase/supabase-js`)。
- 同期の履歴(直近):
  - 本番 #203(`f1c1650`): 検証 #545〜#551(閲覧ヘッダーの出力ボタン、スタイル技能・アウトフィットの
    「参照P→解説」と列幅、閲覧の解説欄の2行表示、解説を開いた行の上下中央ほか)
  - 本番 #204(`9acebb2`): 検証 #552(SNS紹介カード右下を ARCHIVE ID にする)・#553(同カードの
    ライト系テーマで右下の文字が背景に溶ける不具合)。変更は `js/cast-sns-card.js` と `cast.html`(`?v=7`)のみ
  - 本番 #205(`ceb322e`): 検証 #555(SNS紹介カード: ライト系テーマのポートレート枠内ラベル)。
    `js/cast-sns-card.js` と `cast.html`(`?v=8`)のみ
  - 本番 #206(`fd10e93`): 検証 #556(閲覧画面: スタイルの◎を同心円にする)。`css-next/pages/cast.css`、
    `cast-entry.css` と `cast.html`
  - 本番 #207(`f6145b6`): 検証 #557(アカウント作成: 同意チェックのずれ)・#558(モバイル: スタイル変更時の
    能力値の扱いをPCに揃え経験点がずれないようにする)
  - 本番 #210(`ff0ef23`): 検証 #559(PC: 読み込み時に基準値を下回る能力値・制御値を基準値まで引き上げる)
  - 本番 #211(`b7d1c42`): 検証 #562(PC: 起動時の読み込みを埋め込みselect 1回にし、各moduleの重複した
    characters取得を `js/sheet-loaded-character.js` の共有に置き換える)・#563(PC: 既存キャストを開く時の
    アーカイブ接続ロード画面)。runtimeは14ファイル(新規3)。本番側の既存テスト4ファイルは前提が変わるため
    検証の更新済み版に揃えた(新規テストは同期していない)
  - 本番 #212(`13c1e0d`): 検証 #573(キャスト画像サムネイルを長辺840px・目標120KBに変更し、仕様値を
    `js/image-thumbnail-config.js` に集約)。runtimeは6ファイル(新規1)。本番側の既存テスト2ファイルは
    検証の更新済み版に揃えた(新規テスト・再生成スクリプト・CI設定は同期していない)
  - (検証のみ)#575: 再生成スクリプトの `updated_at` 問題の修正。migration・`--limit`・資料。runtimeの変更はなく、
    本番へ同期したのは `supabase/` の2ファイルだけ(下の本番 #213)
  - 本番 #213(`37f4861`): 検証 #575 の migration `20261016_characters_updated_at_ignore_thumbnail.sql` と
    `supabase/migrations-manifest.json` の2ファイルだけ(repo上の履歴を揃えた。DBは適用済みで、このPRではDBを触っていない)
  - (検証のみ)#577: スナップショット復元で `character_sheet_url` と `ofc_details` が戻らない不具合の修正。
    migration `20261017_restore_snapshot_via_ofc_save.sql` とテスト。runtimeの変更はなく、#578 は適用済みにした資料更新
  - 本番 #214(`b45ea29`): 検証 #577 の migration と `supabase/migrations-manifest.json` の2ファイルだけ
    (repo上の履歴を揃えた。DBは検証側で適用済みで、このPRではDBを触っていない)
  - 本番 #215(`d75389a`): 検証 #580(アクト紹介生成: CAST No変更・未登録キャストの倉庫URL取込・再編集時の
    キャスト欠落)・#581(アクト履歴のCAST No.を生成画面に合わせる)。runtimeは20ファイル(新規5、migration含む)。
    本番側の既存テスト5ファイルは `?v=` 前提のため検証の更新済み版に揃えた(新規テストは同期していない)
  - 本番 #216(`f3ffb1c`): 検証 #583(ユドナリウム出力のアクトデータにCS欄を追加)。`js/udonarium-export.js` と
    `js/supabase-client.js`(読み込みの `?v=2`)。本番側の既存テスト1ファイルを検証の更新済み版に揃えた
  - (検証のみ)#585: migration `20261020_unlisted_bundle_troops_public_and_rls_initplan.sql`(適用済み。上記)とテスト。
    runtimeの変更はない
  - 本番 #218(`59e4474`): 検証 #585 の migration と `supabase/migrations-manifest.json` の2ファイルだけ
    (repo上の履歴を揃えた。DBは検証側で適用済みで、このPRではDBを触っていない)
  - (検証のみ)#587: 動作を変えないリファクタリング。`experience-ticket.js`・`sheet-mobile-profile.js` の独自エスケープ関数を
    `js/dom-escape.js` に統一し、`experience.js`・`sheet-mobile-profile.js` の詰め込まれた行を展開(構文木は不変)。
    `js/cast-cyberscan.js`(通常スクリプトで `import` 不可)と `js/showcase-output-css.js`(出力のSHA256をテストが固定)は対象外
  - 本番 #219(`e29059a`): 検証 #587 のruntime 7ファイル(`?v=` と modulepreload を含む)。本番側の既存テスト4件を
    検証の更新済み版と同じ差分で直した(検証のテストファイルはコピーしていない)
  - (検証のみ)#588: `showcases/` の古いサンプル4ファイルを削除(URL共有の実績なし)。`showcases/` を読んでいた
    `tests/showcase-name-normalization.test.mjs` は `renderShowcase()` の出力を検証する形に置き換え、
    `tests/e2e/test-suites.json` の `showcases/**` を外し、`docs/ACT_SHOWCASE_LAYERS.md` を直した
  - 本番 #220(`7f2b4f5`): 検証 #588 と同じ削除と同じ3つの参照箇所の修正(本番側の対象テストは検証と同一内容だった)
  - (検証のみ)#592: ハードコード色の `audit:colors`(`scripts/hardcoded-colors-lib.mjs` ほか)とテスト。モバイルの状態色をトークン化
  - 本番 #221(`5749915`): 検証 #592 のruntime(状態色のトークン化)。`audit:colors` のscript・テストは同期していない
  - (検証のみ)#593: 編集・取込画面の色のトークン化(PR5c)。`audit:colors` の基準値の更新とテスト
  - 本番 #222(`38d1044`): 検証 #593 のruntime
  - (検証のみ)#594: ハンドルが空のとき、`@` だけが残らないよう表示を出さず `aria-hidden` にする
    (`formatHandle` は空文字を返す。クイックシート・アーカイブ・アカウント・生成画面のカード)。ハンドル行は
    `min-height: 1lh` で高さを保つ。クイックシートの出力が変わったためSHA256の基準値(`empty`)を差し替えた。
    モバイル閲覧(`js/cast-mobile.js`)はハンドルがなければ要素ごと出さない作りで対応不要
  - 本番 #223(`fadd58c`): 検証 #594 のruntime 19ファイル(JS 7・CSS 8・HTML 4)。本番側の既存テスト9件を検証の更新済み版と
    同じ差分で直した(検証のテストファイルはコピーしていない)
  - (検証のみ)#596: キャスト閲覧(`cast.css`・`cast-mobile.css`・`cast-mobile-combos.css`)の直書き色のトークン化(PR5d)。
    `audit:colors` は 190→161。人物画像ラベルとスマホのコンボ使用回数は、ライト系3テーマで読めなかった(コントラスト比 1.6〜2.1)のが
    4.0 以上になった。残した色(影・コンボの金・押下中のピンク・クイックシート背景の黒との混色・印刷の白)は検証 #596 の本文。
    `audit:colors` の基準値と新規テスト `tests/cast-view-theme-tokens.test.mjs` は本番へ同期しない
  - 本番 #224(`f43339a`): 検証 #596 のruntime 5ファイル(CSS 4・`cast.html`)。本番側の既存テスト3件は `cast-entry.css?v=` の番号だけ更新
  - (検証のみ)#597: `act-showcase-assign-cards.spec.js` の ASSIGN(`flip=fast`)がタイミング誤差で落ちる件の修正。
    反転の予約時刻(CSS transition の `startTime + delay`)で間隔を厳密に検査し、フレームで見た値には最長フレーム間隔を許容に足す。
    runtimeの変更はない。CPU負荷下で、修正前は21回中3回落ち、修正後は100回すべて成功
  - 本番 #225(`a2a0e2c`): 検証 #597 の同じspec(本番の同ファイルは検証の修正前と同一だった)。本番のCI(Act showcase E2E)も通った
  - (検証のみ)#599: 上の migration `20261021_drop_migration_backup_schemas.sql` とテスト。runtimeの変更はない
  - 本番 #226(`790ecab`): 検証 #599 の migration と `supabase/migrations-manifest.json` の2ファイルだけ(repo上の履歴を揃えた)
  - (検証のみ)migration 20261021 の修正: `DO` ブロックの `c.relkind` を `c.relkind::text` に直し、内容テストに検査を足した。
    実DBへ適用した内容にファイルを合わせる修正
  - 本番 #227: 検証の同じ修正(`20261021_drop_migration_backup_schemas.sql` の1ファイル。manifest は変更なし)
  - 本番 #208・#209 は同期PRではなく、Dependabot の依存更新PR(未マージ。第2節)
  - #215 以外は共有Supabase/DBの変更を含まない(#215 のDB関数は同期前に適用済み)
- 同期するときの注意: 検証と本番は同じオリジン(`https://inarin14311431.github.io`)なので、ブラウザの
  localStorage を共有する。閲覧のスタイル技能表の列幅の保存キーは `…styleSkillColumnWidths.v2` で、
  旧キー v1 からは移行する(v1 は消さない)。同期後も v1 を残してあり、消すかは別の判断にする。
- 資料だけのPR・基準ブランチだけのPR(#538 など)は本番へ同期するruntimeがない。

**runtime/applicationの同期基準**であり、設計資料やREADMEだけのcommitで各repoのmain SHAは
その後進む。固定値を最新mainと解釈しないこと。テスト・CI構成の同期は別で、意図的に同期しない
(`AGENTS.md`参照)。

## 2. 開いているPRとbranch(2026-10-16確認)

- 開いているPR: Dependabotの依存更新のみ。検証 #560(`@fontsource/noto-sans-jp` 5.3.1)・#561(`@playwright/test` 1.64.0)、
  本番 #208(同 noto-sans-jp)・#209(同 playwright)。いずれも未マージで、runtimeには関係しない。
  Playwright 1.64 への更新(検証 #568)は見送りでクローズ済み。経緯と再開時の前提は `docs/TESTING_STRATEGY.md` 第8節。
- 残っているbranch: 検証は `main`・`visual-regression-baseline` と上記Dependabot 2本。本番は `main`・`dashboard-data` と
  上記Dependabot 2本。
- 他の未PR branchは本資料で維持しない。再開前に必ず最新mainとのdiffを確認し、branch名だけで
  「変更済み/不要」と判断しないこと。

## 3. 現時点で統合しないもの

`sheet-save-coordinator.js`(PC)と`sheet-mobile-save-coordinator.js`(Mobile)は名前が似ているが
責務が異なる(PCはsave state machine、Mobileは保存ボタンDOMと`tnx:mobile-before-save`の
task aggregationが中心)。無理に統合するとUI依存がshared coreへ入るため統合しない。

## 4. 次の共通化候補: js/cast-ui.js

`js/cast-ui.js`には`js/sheet-navigation-core.js`と同種の重複ロジック(`PARENT_RETURN_PAGES`、
`parseReturnDestination`、`parentReturnHref`相当)が存在する。他の責務(スタイル/能力値/技能/
アウトフィット等のDOM描画)との切り分けは未調査。詳細・推奨手順は
`docs/archive/CURRENT_STATE_20260925.md`第10節。

act-showcaseの「本体が作ったものを削除して作り直す」重複(`js/act-showcase-board-layout.js`等)も
未着手。現状は`docs/ACT_SHOWCASE_LAYERS.md`、経緯は`docs/archive/CURRENT_STATE_20260925.md`第11節。

## 5. 既知の制限

- `tests/e2e/act-showcase-assign-cards.spec.js` の ASSIGN は、カード反転の間隔の検査が CI の負荷で落ちることがあった(検証 #592・
  本番 #223)が、検証 #597・本番 #225 で直した。再び落ちたら、予約時刻(`log.scheduled`)の検査と、フレームで見た値(`log.maxFrame`
  を許容に足している)のどちらが落ちたかを見分ける。前者なら演出の遅れ、後者なら計測の粗さ。
- statistics-bureau テーマの `--color-warning` / `--color-success` は淡い色のまま(ライト背景でのコントラスト比 約1.8 / 1.6)。
  `css-next/themes/base-ui.css` の `:root:not([data-theme=...])` の列挙に statistics-bureau が含まれず、テーマ側の定義が
  上書きされているため。統計局テーマの改善は保留中で、直していない。
- `js/cast-cyberscan.js` は独自の `escapeHtml` を持ったまま(`cast.html` が `type="module"` なしの通常スクリプトで読むため
  `js/dom-escape.js` を `import` できない。モジュール化すると実行が遅延し strict mode になり、スキャン演出のタイミングが変わりうる)。
- `js/showcase-guests.js`は対象外(別テーブル`act_showcase_guests`、`image_thumbnail_url`列なし)。
- 閲覧のスタイル技能表は、1200px未満(タブレット等)では従来どおり枠内で横スクロールする(#548 は1200px以上が対象)。
  アウトフィットのように、タブレットでは解説を項目の下の行へ移す方式が使える(未着手)。
- 閲覧の列幅を保存済みの人は、保存した固定幅が優先される。#548 の枠幅への追従は「列幅を初期化」を押すまで効かない。
- 解説の2行表示(#550)は閲覧画面の表だけが対象。簡易表示・モバイル表示・編集画面・troop.html は別の仕組みのまま。
