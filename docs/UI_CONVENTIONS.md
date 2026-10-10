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

## 閲覧の背景(データ雨)

0と1の縦の列に単語が混ざる飾り。色はテーマ変数、画面中央は弱めて本文にかぶらないようにする。
次の場合は表示しない: 自動ブラウザ(`?scan=full` で表示)、`prefers-reduced-motion`、幅600px以下、
印刷、簡易表示を開いているとき。定義は `js/cast-cyberscan.js`(列・単語)と
`css-next/pages/cast-cyber-runtime.css`(色・弱める範囲)、`css-next/pages/cast.css`(非表示の条件)。
数値はそちらを見る。

## 色とテーマ

- 色は必ずテーマ変数(`--color-*` など)経由。直書きしない。
- 見た目を変えたら、nova以外でも確かめる: ライト系(intron など)、spectrum-neon、statistics-bureau。
