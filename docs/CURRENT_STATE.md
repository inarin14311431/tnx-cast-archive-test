# 現在地 / Current State

最終更新: 2026-10-13

AIや新規担当者が「何が完了済みで、何が途中か」を誤認しないためのスナップショット。時点情報
なので、作業再開時はGitHub上のmain/PR/branchを再確認すること。固定のSHAやPR番号はこの資料にだけ置く。

## 1. Runtime同期基準点

- 検証repo main: `fcbadd0`(PR #551 マージ点, 2026-10-13)。画面比較の基準ブランチ
  `visual-regression-baseline` は `d550978`(PR #538 マージ点)のまま。
- 本番repo main: `47f61b5`(同期PR #202)。検証 #544 までのruntimeを同期済み(検証 `55cb70e` と本番mainの
  `js/`・`css-next/`・`*.html`・`config/`・`supabase/` の差分が0であることを実ファイルで確認)。
- 未同期のruntime: 検証 #545〜#551(いずれも画面の見た目・列順・幅の修正。共有Supabase/DBの変更は含まれない)。
  - #545: 閲覧ヘッダーの出力ボタン(1200px以上)のラベルを1行に収める
  - #546: スタイル技能の「参照P→解説」(編集・閲覧)。閲覧の列幅の保存キーを `…styleSkillColumnWidths.v2` へ
  - #547: アウトフィット閲覧の「参照P→解説」
  - #548: 閲覧のスタイル技能表を枠幅に収める(1200px以上で横スクロールなし)、タブ列とコンボの間の縦線を1本に
  - #549: 編集画面のスタイル技能表の列幅グリッドを「参照P→解説」に合わせる
  - #550: 閲覧の解説欄を2行表示(あふれは「…」、「全表示」で全文)
  - #551: 解説を開いた行のセルを上下中央にそろえる
- 同期するときの注意: 検証と本番は同じオリジン(`https://inarin14311431.github.io`)なので、ブラウザの
  localStorage を共有する。#546 は列幅の保存キーを v2 にしたが、本番は同期前の間 v1 を読むため、v1 は残してある。
  同期後に v1 を消すかは別の判断にする。
- 資料だけのPR・基準ブランチだけのPR(#538 など)は本番へ同期するruntimeがない。

**runtime/applicationの同期基準**であり、設計資料やREADMEだけのcommitで各repoのmain SHAは
その後進む。固定値を最新mainと解釈しないこと。テスト・CI構成の同期は別で、意図的に同期しない
(`AGENTS.md`参照)。

## 2. 開いているPRとbranch(2026-10-13確認)

- 開いているPR: 検証は #540(この資料の更新)のみ。本番はgit上のbranchが `main` と `dashboard-data` だけで、
  PR用のbranchはない(PR一覧そのものは確認していない)。
- 残っているbranch: 検証は `main`・`visual-regression-baseline` と、#540 の資料branch。本番は `main` と `dashboard-data` のみ。
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
