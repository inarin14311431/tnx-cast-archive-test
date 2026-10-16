# 現在地 / Current State

最終更新: 2026-10-16

AIや新規担当者が「何が完了済みで、何が途中か」を誤認しないためのスナップショット。時点情報
なので、作業再開時はGitHub上のmain/PR/branchを再確認すること。固定のSHAやPR番号はこの資料にだけ置く。

## 1. Runtime同期基準点

- 検証repo main: `ea2bfca`(PR #573 マージ点, 2026-10-16)。画面比較の基準ブランチ
  `visual-regression-baseline` は `28fa7ae`(revert #571 のマージ点)。中身は `d550978`(PR #538 マージ点)と
  同一で、Playwright 1.62.1 時代の基準画像のまま(1.64 への更新は見送り。`docs/TESTING_STRATEGY.md` 第8節)。
- 本番repo main: `13c1e0d`(同期PR #212 マージ点)。検証 #573 までのruntimeを同期済み。検証 `ea2bfca` と
  本番mainの `js/`・`css-next/`・`config/`・`supabase/`・`assets/`・ルートの `*.html` の差分が0であることを
  実ファイルで確認した(2026-10-16)。
- 未同期のruntime: なし。
- 同期していないツール類: 検証にだけある `scripts/regenerate-thumbnails.mjs`(`npm run thumbnails:regenerate`)と
  その devDependencies(`sharp`・`@supabase/supabase-js`)。既存サムネイルの作り直しはオーナーが検証repoから
  実行する管理作業で、手順は `docs/THUMBNAIL_REGENERATION.md`。実行したかどうかはこの資料では追わない。
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
  - 本番 #208・#209 は同期PRではなく、Dependabot の依存更新PR(未マージ。第2節)
  - いずれも共有Supabase/DBの変更は含まない
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

- `js/showcase-guests.js`は対象外(別テーブル`act_showcase_guests`、`image_thumbnail_url`列なし)。
- 閲覧のスタイル技能表は、1200px未満(タブレット等)では従来どおり枠内で横スクロールする(#548 は1200px以上が対象)。
  アウトフィットのように、タブレットでは解説を項目の下の行へ移す方式が使える(未着手)。
- 閲覧の列幅を保存済みの人は、保存した固定幅が優先される。#548 の枠幅への追従は「列幅を初期化」を押すまで効かない。
- 解説の2行表示(#550)は閲覧画面の表だけが対象。簡易表示・モバイル表示・編集画面・troop.html は別の仕組みのまま。
