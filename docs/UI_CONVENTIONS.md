# 画面の文言・見た目の決まり

画面の文言や見た目を変えるときの決まり。コードで確認済みのものだけを書く。CSSの持ち主は
`docs/CSS_ARCHITECTURE.md`、テーマは `docs/THEME_SYSTEM.md`、確認手順は `docs/TESTING_STRATEGY.md`。

## 表記

- CS は COMBAT SPEED(`CS <small>COMBAT SPEED</small>`)。
- 神業 = DIVINE WORK。市民ランク = CITIZEN RANK(幅が狭い簡易表示だけ RANK)。
- コネクション(長さが問題の簡易表示・コンボ種別だけ コネ)。
- スタイル技能の種別は 特技(標準値)/秘技/奥義/演出/なし。
- 装備品の欄・タブは アウトフィット(装備 と書かない)。
- ハンドルは “ ” 1組で囲む(`js/cast-display-format.js` の `formatHandle`)。外側の引用符は重ねない。
- 著作権表記は英語の形 `(C)FarEast Amusement Research Co.,Ltd.／(C)GameField Co.,Ltd.`(`js/legal-notices.js`)。
- 閲覧ヘッダーの転記ボタンの表記は 転記TSV(CAST DATA COPY)と 転記BM(COPY BOOKMARKLET)。

## ラベルと空表示

- 日本語ラベルの横に小さい英字(`<small>`)を添える形を保つ。英字を消さない。
- データがないときは「日本語 + `<small>英字</small>`」の `<p class="empty-data">`。英語だけにしない。
  例: `コンボは登録されていません。<small>NO COMBO DATA</small>`。
- 名前が空の神業は `未登録`(muted色、登録済みより細く)。

## スタイルの印(◎ ●)

- スタイル名の直後に詰めて置く(例: ヒルコ◎●)。印のあるものだけ描き、割り当てのない印は出さない。
- 印そのものに文字ラベルは付けない。◎と●は同じ大きさ・同じ濃さに見せる。
- スロット右上の PERSONA / SHADOW / KEY はスタイルの役割表示で、印とは別物。

## 能力値

- 一般技能・スタイル技能の見出しの右に `ABILITIES ♠ ♣ ♥ ♦` の一覧を出す(編集・閲覧とも。制御値は出さない)。
  見出しの幅が足りないときは一覧ごと隠す。
- 技能表の列見出しには能力値・制御値を出さない(ツールチップ・切り替え表示は廃止済み)。

## 共通の型

- 管理系画面のヘッダーは共通の型 `.page-header`。
  - 対象: account / acts / backup / combos / troops / troop / login / password-reset / showcase-generator / sheet。
  - 対象外: キャスト一覧(index)・キャスト閲覧(cast)・統計局(statistics)・スマホ画面(sheet-mobile*、
    mobile-transfer)・アクト紹介本体(act-showcase*)・404・edit・manual-data-import。
  - 画面ごとに大きさ・配置を再指定しない。その画面にしか要らない右の枠の中身だけを残す。
- 折りたたみの印は共有の山形(CSSだけで描く)。開=下向き、畳み=右向き。色は画面ごとの `--chevron-color`。
- 閲覧ヘッダーの出力ボタン: 枠と背景はテーマ色。`--export-accent` は左の縦線・hover時の枠・コピー/出力の
  状態表示だけに使う。hoverで塗りつぶさない(文字色と背景を通常時の値で明示する)。
  1200px以上では縮める(`flex: 0 1 118px; min-width: 0`)ので、ラベルは折り返さず1行で、入りきらない英字は
  省略記号にする(`css-next/pages/cast-desktop-layout.css`)。ARCHIVE ID の列は縮めない。
- 閲覧のタブ列と「コンボ」(技能表へ移るジャンプボタン。タブではない)の間の区切りは、最後のタブの右罫線の
  1本だけ。ジャンプボタン側に `::before` の線や左罫線を足して二重・三重にしない(`css-next/pages/cast.css`)。

## 表の列順と幅

- 「参照P」は「解説」より前に置く。スタイル技能(編集・閲覧)も、アウトフィット(編集・閲覧)も同じ。
  TSVの取込・出力の列順と保存データは別で、これとは関係なく変えない。
- 列の順を変えるときは、**幅を位置で決めている場所**を全部直す。入れ替えただけでは入力欄だけが動いて幅が元の位置に残る。
  - 編集画面のスタイル技能表: `css-next/editor/style-skills.css` の `grid-template-columns`(列の順に並ぶ)
  - 閲覧のスタイル技能表: `js/cast-style-skills.js` の `<colgroup>` と、`js/cast-style-skill-table-controls.js` が
    localStorage に保存する列幅(キーが列番号。順を変えたらキーの版を上げ、旧キーの幅を入れ替えて引き継ぐ。
    旧キーは本番が読むうちは消さない)
  - 閲覧のアウトフィット: 列は項目名のクラス(`cast-outfit-col--<項目名>`)で幅を決めるので、順だけ
    `js/cast-view-definitions.js`(`OUTFIT_SCHEMAS`)を直せばよい。編集画面は `js/outfit-tables.js` と
    `js/outfit-display-rules-v5.js`
- 閲覧のスタイル技能表は枠幅に追従する(`width: 100%`、最小 `min-width: 1136px`)。固定幅の列が合計 988px で、
  解説の列が残りを受け持つ。1200px以上は横スクロールなし、未満は枠内スクロール。列幅を保存している人は
  保存した固定幅が優先される(「列幅を初期化」で戻る)。

## 閲覧の解説欄

閲覧画面の表(スタイル技能表・アウトフィットの全表)の解説は、2行まで表示して、あふれる分は2行目の末尾を
「…」にする。「全表示」と、解説をクリックしたときは全文を出す。表ごとに見え方を変えない(同じ部品・同じ規則)。

- 部品: `<div class="style-description-expandable" role="button" tabindex="0">` の中に
  `<span class="style-description-text">`(`js/cast-style-skills.js`・`js/cast-outfits.js`)。
  省略は `cast.css` の `.style-description-text` の `-webkit-line-clamp: 2`。textarea は line-clamp が効かないので使わない。
- クランプする箱(span)にパディングを付けない。外側の div に付ける(付けると3行目がはみ出して見える)。
- 展開は `is-expanded` の class の切替だけ。高さを JS で測らない。div は既定でフォーカスできないので、
  `role` と `tabindex` は描画するマークアップに最初から付ける(後から付けると、あとで描かれる表で間に合わない)。
- 1行に収まる解説・空の解説は、行の高さを増やさない(`min-height: 35px`)。
- 展開した行のセルは全部、閉じた行と同じ上下中央のまま。`tr.is-description-expanded` の規則に
  `vertical-align: top` を入れない(行の全セルに当たる。名称セルだけは別の規則で中央が残るので気づきにくい)。
- 対象外: 簡易表示(別の切替)、モバイル表示、編集画面、troop.html。

## 閲覧の背景(データ雨)

0と1の縦の列に単語が混ざる飾り。色はテーマ変数、画面中央は弱めて本文にかぶらないようにする。
次の場合は表示しない: 自動ブラウザ(`?scan=full` で表示)、`prefers-reduced-motion`、幅600px以下、
印刷、簡易表示を開いているとき。定義は `js/cast-cyberscan.js`(列・単語)と
`css-next/pages/cast-cyber-runtime.css`(色・弱める範囲)、`css-next/pages/cast.css`(非表示の条件)。
数値はそちらを見る。

## 色とテーマ

- 色は必ずテーマ変数(`--color-*` など)経由。直書きしない。
- 見た目を変えたら、nova以外でも確かめる: ライト系(intron など)、spectrum-neon、statistics-bureau。
