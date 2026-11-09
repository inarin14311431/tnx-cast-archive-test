# アクト紹介生成画面(showcase-generator.html)の作り直し — 調査と分け方

最終更新: 2026-11-08(第1段階の調査。コードは変えていない)

`showcase-generator.html` を、入力欄が多くて分かりにくい状態から、使いやすい画面に作り直すための調査。
画面の構成(3列、01〜04の区画、手動キャスト、見せ方、公開の欄)は決定済みで、この資料は
**今の実装がその構成を受け止められるか、どこに手を入れるか、何本のPRに分けるか**を書く。

## 1. 結論

- **保存データ(`showcase_data`)の形は変えずに作り直せる。** 保存・公開・読み込み・復元は、入力欄の `id` と
  `data-field` と、生成したHTMLの中身(`.cast-card__*` など)だけを読む。画面の構造と見た目は、この「読まれる側の約束」を
  守る限り、自由に組み替えられる(§4)。
- **ただし決定事項と今の実装が食い違う点が6つある**(§6)。うち動作が変わるのは「公開の前にHTMLを生成する必要がある」
  という今の前提で、主ボタンを「豪華版で公開」にするなら、公開が自動で生成するように直す必要がある。
- **手動キャストの画像は、DB・Storageの設定変更なしでできる**(§7)。ゲストの画像と同じバケット・同じ手順を使う。
  migration は要らない。
- **実装は5本のPRに分ける**(§8)。決定事項の4本の前に、見た目を変えない「公開の流れ」のPRを1本足す。

## 2. 今の構成

静的HTMLは105行で骨組みだけを持ち、画面の大半は **25本ほどのモジュールが読み込み後にDOMへ足したり書き換えたり**して
できている。読み込みの順は `js/showcase-generator-loader.js` が決めている。

| 順 | モジュール | 役割 |
|---|---|---|
| 1 | `showcase-generator-v3.js` | 本体。キャストの取得(公開・自分の非公開)、検索・絞り込み、選択(`selectedCasts`、モジュールの外から見えない)、出演順の行(`#selected-casts`)、手動追加、HTML生成(`renderShowcase`)、履歴だけ登録 |
| 2 | `showcase-act-subtitle.js` | `#act-subtitle` を足し、生成HTMLの `.hero h1 span` へ書き込む。復元(`?edit=`)でサブタイトルを戻す |
| 3 | `showcase-scenario-writer.js` | `#scenario-writer-name` を `#ruler-name` の隣へ足す。生成HTML・コピー・ダウンロードに書き込む |
| 4 | `showcase-dedicated-output.js` | 生成HTMLをスタンダード版のレイアウト・テーマに整える |
| 5 | `showcase-guests.js` | ゲスト区画(`#showcase-guest-panel`)を最後の区画の前へ足す。ゲストの編集・画像アップロード・生成HTMLへの注入 |
| 6 | `showcase-guest-publish-bridge.js` | 公開ボタンを横取りし、ゲストを `replace_act_showcase_guests_for_current_user` で保存してからボタンを押し直す |
| 7 | `showcase-dynamic-publish-v3.js` | 公開ボタン(`[data-publish-mode]`)を横取りし、**生成HTMLを解析して `showcase_data` を作り**、`publish_act_showcase_for_current_user` で保存する |
| 8 | `showcase-publish-url-canonicalizer.js` | 公開完了メッセージのURLを整える |
| 任意 | `showcase-tagline.js` / `-tagline-auto.js` / `-history-role.js` | 出演順の行へ「一言／キャッチコピー」欄を足す(行番号で持つ)。一言の自動入力(概要の最初の「」)。履歴の参加枠の保存 |
| 任意 | `showcase-output-normalizer.js` / `-scene-selector.js` / `-edit-restore.js` / `-delete.js` / `-owned-list.js` | 表示名の整え、演出の構成の切り替え、公開済みの再編集(復元)、公開の取り下げ、公開済み一覧の見た目 |
| 別 | `showcase-cast-pagination.js` / `-background-preset-picker.js` / `-auto-slug.js` / `-wording.js` / `-remove-label.js` / `-trailer-multiline.js` / `-handle-normalizer.js` | 候補の「さらに15件」、背景プリセット、識別名の自動、文言の整え、削除ボタンの文言、トレーラーの改行、ハンドルの整え |

CSS は `css-next/pages/showcase-entry.css` が `showcase.css`(135行、直書きの色106)・`showcase-guests.css`・
`showcase-owned-list.css`・`showcase-theme.css` などを束ねる。

### 2.1 仕組みの要点(作り直しで効いてくる)

1. **公開データの源は「生成したHTML」。** `#showcase-preview`(iframe)の `srcdoc` を `showcase-dynamic-publish-v3.js` が
   `DOMParser` で解析して、キャストごとの画像・名前・スタイル・メタ・一言・ハンドアウトを取り出す。
   生成前は公開ボタンが無効で、「先にHTMLを生成してください」と出る。入力が変わると生成HTMLは捨てられ、ボタンはまた無効になる。
2. **生成HTMLは複数のモジュールが順に書き換える。** サブタイトル、SCENARIO WRITER、一言、参加枠の強調、ゲストの注入、
   表示名の整えが、`#showcase-preview` の `load` や `srcdoc` の変化を見て追記する。`#showcase-preview` はDOMに置いたままにする。
3. **モジュール同士は DOM と `id`/`data-*` で連携する**(イベントは `tnx:showcase-selection-rendered` だけ)。
   `selectedCasts` は `showcase-generator-v3.js` の中の変数で、ほかのモジュールは `#selected-casts` の行
   (`[data-selected-index]`、`[data-character-id]`、`[data-visibility]`、`[data-manual]`)を読む。
4. **復元(再編集)は画面を操作して戻す。** `showcase-edit-restore.js` は、公開キャストのカード
   (`[data-public-character-id]`)をクリックして選び、`#add-manual-cast` を押して手動枠を作り、`[data-field]` の欄へ値を入れて
   `input`/`change` を飛ばす。削除は `[data-action="remove"]` のクリック。
5. **一言(tagline)は行番号の配列で持つ。** `showcase-tagline.js` の `taglines[index]` は、候補カードのクリック、
   手動追加、↑↓削除のクリックを自分で見て並べ替える。出演順の行の並べ替えを別の仕組み(ドラッグなど)で行うと、一言がずれる(§6-2)。
6. **足されるDOMは、すでにあれば足さない。** `#act-subtitle`、`#scenario-writer-name`、`#showcase-guest-panel`、
   `#owned-showcase-restore`、`#delete-owned-showcase`、`#showcase-scene-composition` は存在を確かめてから足すので、
   新しいHTMLに最初から置いておける。ただし一部は足す場所を決め打ちしている(§4)。

## 3. 入力欄と、それを読む側

`●` = 読む・書く。`restore` = 再編集で値を戻す。`出力` = 生成HTML/`showcase_data` に入る。

| 欄(id / data-field) | v3 | 公開 | 復元 | 備考 |
|---|---|---|---|---|
| `#page-title` | ● | `pageTitle` | restore | 空なら `ACT CAST FILE`。新デザインでは「詳細設定」に畳む(空欄ならアクトタイトルを使う、は§6-7) |
| `#act-name` | ● | `actName`・`p_act_name` | restore | 識別名の自動提案の元。文字数の案内は `showcase-wording.js` が `#act-name-length-guide` を足す |
| `#act-subtitle` | (subtitle) | `heroSubTitle` | restore(`?edit=`) | 生成HTMLの `.hero h1 span`。空は `CAST SHOWCASE` |
| `#ruler-name` / `#scenario-writer-name` | ● / (writer) | `rulerName` / `scenarioWriterName` | restore / 別途復元 | SCENARIO WRITER 欄は `#ruler-name` の `label` の前に `div` を足して並べる。最初から横並びで置けば足されない |
| `#intro-text` | ● | `trailer.body` | restore | 改行を保持(`showcase-trailer-multiline.js`) |
| `#showcase-theme` | ● | `theme` | restore | 4値(`nova`/`intron`/`vlad`/`lutetia`)。`change` で生成HTMLを無効にする。`<select>` のまま隠し、カードの選択で値と `change` を入れる形にできる |
| `#showcase-scenes`(hidden) | — | `scenes` | restore | JSON。`#showcase-scene-composition` の中の `select[data-scene-frame]` が書く。**この値の形は変えない** |
| `#background-preset`(hidden)・`#background-url`・`#background-file` | ● | `background` | restore(URLのみ) | URLが優先、ファイルは公開時に約300KBへ圧縮。プリセットは `showcase-background-preset-picker.js` が `#background-preset-grid` を描く |
| `#publish-slug` | ● | `slug` | restore | 半角英数とハイフン。`edited` フラグで自動提案を止める。履歴登録・公開・ゲストの保存・ダウンロード名に共通 |
| `#cast-search`・`#player-filter`・`#style-filter` | ● | — | — | 候補の絞り込み。`showcase-cast-pagination.js` が15件ずつ表示 |
| `#public-cast-grid` の `[data-public-character-id]`・`#owned-private-cast-grid` の `[data-private-character-id]` | ● | 公開は `participantIds` | restoreがクリック | `aria-pressed` が選択状態 |
| `#add-manual-cast` | ● | — | restoreが押す | 手動枠を末尾に足す(6件まで) |
| `#selected-casts` の行 | ● | 行の `data-character-id`/`data-visibility` | restoreが操作 | 下の `data-field` を持つ |
| ↳ `data-field="cast-no"` | ● | `slot`(CAST 0n)・並び順の同期 | restore | 空欄は行の位置から決める。重複は生成時エラー |
| ↳ `data-field="quote"`(参加枠) | ● | `handout.title`・履歴の参加枠 | restore | 公開キャストは `<select>`(共通+スタイル)、手動は `<input>` |
| ↳ `data-field="description"`(ハンドアウト本文) | ● | `handout.body` | restore | |
| ↳ `data-field="tagline"`(一言) | tagline.js | `tagline` | restore | **決定事項の「項目は今のまま」に書かれていないが、保存データに入る**(§6-2) |
| ↳ `data-field="manual-*"`(名前・スタイル・PL・所属・年齢・性別・市民ランク・倉庫URL) | ● | `fullName`・`styles`・`meta` | restore(画像以外) | 倉庫URLからの取り込みは `showcase-manual-sheet-import.js` |
| `#generate-button` / `#download-button` / `#copy-button` | ● | — | — | 生成・保存・コピー。ゲストを含むときの保存・コピーは `showcase-guests.js` が横取りする |
| `#history-button` | ● | — | — | 履歴だけ登録(`record_act_history_for_current_user`)。手動枠は履歴の対象外 |
| `#publish-button`(旧・非表示)・`#publish-standard-button`・`#publish-cinematic-button` | ● | — | — | `[data-publish-mode]` が公開。旧ボタンの `disabled` が「公開できるか」の唯一の判断元(MutationObserverで同期) |
| `#showcase-preview`(iframe) | ● | **データの源** | — | §2.1-1 |
| `#generator-status` | ● | — | — | 全モジュールの状態表示の出し先(1か所に集約) |
| `#showcase-guests`・`#add-showcase-guest`・`#guest-count`(`[data-guest-field]`/`[data-guest-action]`) | guests.js | 別テーブル `act_showcase_guests` | 別途 | ゲストは `showcase_data` に入らず、`replace_act_showcase_guests_for_current_user` で保存する |
| `#owned-showcase-select`・`#load-owned-showcase`・`#delete-owned-showcase`・`#owned-showcase-status` | edit-restore / delete / owned-list | — | — | `?edit=<slug>` へ遷移して復元する。削除は `delete_owned_act_showcase`(確認ダイアログあり) |

## 4. 保存データの形を変えずに済むか

**済む。** 理由と、守る約束:

- 公開・HTML生成・復元が読むのは §3 の `id`/`data-field` と、生成HTMLの `.cast-card__*`・`.hero__*` だけで、
  画面の見た目や並びには依存しない。
- 守る約束(新しいHTML・JSで必ず残す):
  1. §3 の `id` と `data-field` の名前と意味(`#showcase-scenes` の値の形、`[data-publish-mode]`、`#generator-status`、`#showcase-preview` を含む)。
  2. 出演順の行の属性: `[data-selected-index]`、`[data-character-id]`、`[data-visibility="public|private"]`、`[data-manual="true"]`、
     `[data-action="remove"|"up"|"down"|"sheet-import"]`。
  3. 候補カードの `data-public-character-id`/`data-private-character-id` と `aria-pressed`。
  4. 足し込み先の決め打ち: `showcase-edit-restore.js` は `.showcase-panel .showcase-panel__body.form-grid` の先頭へ復元欄を足す。
     `showcase-guests.js` は `main.showcase-layout > .showcase-panel` の**最後の区画の前**へゲスト区画を足し、最後の区画の見出し番号を
     `04`→`05` に書き換える。`showcase-tagline.js` は行の `.selected-cast__fields`/`.selected-cast__manual-fields`
     と `.selected-cast__handout-field`/`.manual-field--handout` の前に一言欄を足す。`showcase-scenario-writer.js` は `#ruler-name` の
     `label` を `div` で包む。→ 新しいHTMLでは、これらの欄を**最初から置いて**足し込みを不要にする(存在すれば足さない)か、
     足し込み先のセレクタを新しい構造に合わせて直す。どちらにしても、そのPRのテストで確かめる。
  5. 画面の見出し番号(`01`〜`04`)は、ゲスト区画が書き換える。新デザインの番号は左のナビが持つので、書き換えを止める。
- `showcase_data` の形(`version: 2`、`casts[]` の各キー、`scenes`、`trailer`、`background` など)と、
  `publish_act_showcase_for_current_user`・`replace_act_showcase_guests_for_current_user`・`get_owned_act_showcase_editor`・
  `delete_owned_act_showcase` の引数と戻り値は変えない。旧データの読み込みは `showcase-edit-restore.js` と
  `showcase-restore-matching.js` が担うので、そこは触らない。

## 5. テストと画面比較

### 5.1 生成画面を触っているテスト

| テスト | 頼っているもの | 作り直しでの扱い |
|---|---|---|
| `tests/e2e/showcase-editor-restore.spec.js` | `#owned-showcase-restore`・`#owned-showcase-select`・`#delete-owned-showcase`・`#owned-showcase-status`、`#page-title`・`#act-name`・`#showcase-scenes`・`#ruler-name`・`#intro-text`・`#background-url`、行の `[data-field=…]`(`manual-name`/`manual-styles`/`manual-player`/`quote`/`description`/`tagline`) | **復元の帯が「公開済みを編集」を押したときだけ開く**ので、帯を開く操作を足す。値の確認は同じ内容を保つ。`#page-title` が「詳細設定」に畳まれても `toHaveValue` は見える・見えないに関係しない |
| `tests/e2e/showcase-scene-selector.spec.js` | `#showcase-scene-composition`・`#showcase-scenes`・`select[data-scene-frame]` | 演出の構成が畳まれる(§6-5)ので、開く操作を足す。「A / B のボタン」に変わる場合は、`select` ではなくボタンを押す形に書き換え、保存値(JSON)が同じになることを確かめる |
| `tests/e2e/output-rendering.spec.js` | `[data-public-character-id]`・`[data-selected-index]`・`[data-field="quote"]`・`#generate-button`・`#publish-button`(有効/無効)・`#download-button`・`#showcase-preview` | 公開の判断元(`#publish-button` の `disabled`)を残す(§6-1)。生成ボタンが「HTMLを書き出す」の画面の中に入るなら、画面を開く操作を足す |
| `tests/e2e/showcase-background-preset-legacy.spec.js` | `#background-preset`・`#background-preset-grid`・`#background-url` | 背景の「自分の画像を使う」が畳まれるので、開く操作を足す |
| `tests/showcase-scene-selector.test.mjs`・`showcase-scenes-save-restore.test.mjs`・`showcase-editor-restore.test.mjs`・`showcase-cast-number-restore.test.mjs`・`showcase-cast-pagination.test.mjs`・`showcase-publish-modes.test.mjs`・`showcase-delete.test.mjs`・`showcase-owned-list.test.mjs`・`showcase-wording-observer-contract.test.mjs`・`showcase-publish-loader-contract.test.mjs`・`showcase-followup-contract.test.mjs`・`act-showcase-guest-publish-and-format.test.mjs` ほか | モジュールのソースの文字列(`querySelector("#…")`、`data-field`、読み込み順、`?v=` の固定など)を正規表現で確かめる契約テスト | モジュールのセレクタを変えたPRで、同じ内容を確かめる形に直す。**弱めない** |
| `tests/visual/operational-pages.visual.spec.js`(基準ブランチ) | `/showcase-generator.html` を開き、`#public-cast-grid` が見え、`data-showcase-generator-state="ready"` になったら全画面を撮る | **`#public-cast-grid` は候補の枠に残す**(切り替えの裏でも `toBeVisible` が通るように、公開タブを既定で開く)。撮影は4枚(nova・spectrum-neon × desktop・mobile) |
| `scripts/showcase-hardcoded-colors-baseline.json` | `showcase.css` 106色、`showcase-guests.css` 26色、`showcase-guests.js` 10色などの上限 | 上限は下げるだけ。**新しいCSSファイルは直書きの色を0**にし、`var(--showcase-*)` を使う。置き換えたルールを消したら `npm run audit:showcase-colors -- --update` で下げる |

### 5.2 画面比較

- 見た目が変わるPRは、基準画像の更新PRを先に作る(`docs/TESTING_STRATEGY.md` 第8節)。生成画面の4枚は、
  骨組みのPRで全部変わる。以降のPRでも、撮影の状態が変わらない(キャストを選ばない状態を撮る)なら、変わるのは画面の枠が
  変わったPRだけ。
- 撮影は「キャスト未選択」の1状態だけ。キャストを選んだ行、ハンドアウトを開いた行、手動追加のフォーム、演出の構成を開いた状態は
  今の画面比較に無い。作り直しの中で**状態を足すかどうか**は §8 の各PRで決める(足すなら、基準ブランチの
  `tests/visual/operational-pages.visual.spec.js` に先にspecだけを入れる)。

## 6. 決定事項と今の実装が食い違う点(要判断を含む)

1. **「豪華版で公開」の前に、HTMLを生成する必要がある。** 今は公開が生成HTMLを源にするので、生成前は公開ボタンが無効。
   新しい画面では「HTMLを書き出す」を控えめな操作にし、主ボタンを公開にするので、**公開の押下が内部で生成してから公開する**
   必要がある。生成は `#generate-button` のクリックで起きるが、その後に複数のモジュールが `load` の連鎖で生成HTMLを書き換えるため、
   「いつ終わったか」の判断が要る(`srcdoc` が空でなく、直近の `load` から1フレーム動きがない、など)。
   → 見た目を変えない**独立したPRとして先に行う**(§8のPR1)。動作の変更なので、E2Eで「生成せずに公開できる」「入力を変えたら
   もう一度生成される」「私的キャストを含むと公開できない」を確かめる。
2. **一言／キャッチコピー(`data-field="tagline"`)が決定事項にない。** 保存データ(`casts[].tagline`)に入り、復元でも戻る
   項目なので、消すとデータが落ちる。ハンドアウトの行の開いた中に残す案を提案する(CAST No・参加枠・一言・ハンドアウト本文の4項目)。
   また一言は行番号の配列で持っているため、ドラッグでの並べ替えに対応するには、`taglines` を選択の1件ごとの値へ持たせ直す
   (`showcase-generator-v3.js` の `selectedCasts` の要素に `tagline` を持たせ、`showcase-tagline.js` はそれを読む)。
   データの形は変わらない。PR3(キャスト)に含める。
3. **「並べ替えのつまみ」の実装。** 今は ↑↓ ボタン(`[data-action="up"|"down"]`)。つまみはドラッグ&ドロップになるが、
   キーボードでも並べ替えられるよう ↑↓ も残す(つまみにフォーカスして矢印キー、または行末のボタン)。`up`/`down` の属性は復元と一言が見るので残す。
4. **ゲストの「小さなカード」。** 今のゲストは編集フォームが常時開いている(`showcase-guest-editor`)。カードに畳み、
   クリックで編集が開く形にする。中身の動作(画像アップロード、`[data-guest-field]`、保存)は変えない。`showcase-guests.js`
   のレイアウト決め打ち(§4-4)を直す。
5. **演出の構成の「A 標準 / B:<パターン名>」。** パターン名はコードに無く(`select` の選択肢は「パターン B」)、
   資料にだけある(例: loading B=起動ターミナル、trailer B=縦組み、finale B=キービジュアル)。名前の表
   (`SCENE_PATTERN_NAMES` のようなもの)を `js/showcase-scene-selector.js` に足し、`act-showcase-scenes.js` の
   `PLAYABLE_PATTERNS` と一緒に増やす。要約(「B:タイトル・ACT READY/ほかは A」)は保存値(`#showcase-scenes`)から作る。
   `select[data-scene-frame]` を残すか(畳んだ中に置く)、ボタンに替えるかは、テストの書き換えの量で決める(ボタンに替えても
   `#showcase-scenes` の値が同じなら保存データは変わらない)。
6. **見出し番号とゲスト区画の挿入。** 区画の番号は左のナビが持つ。`showcase-guests.js` の「最後の区画の前に足す・番号を書き換える」は
   止める(§4-5)。ゲストは「02 キャスト」の中に置くので、足し込み先を直す。
7. **ページタイトルを空欄にしたとき、アクトタイトルを使う。** 今の生成は `#page-title` が空のとき `ACT CAST FILE` になる
   (`showcase-generator-v3.js`)。新しい指定では「空欄ならアクトタイトルを使う」ので、生成のときの既定を `#act-name` に変える
   (保存される `pageTitle` が変わる。旧データの読み込みは `showcase.pageTitle` をそのまま入れるので影響しない)。
   データの形は同じだが**値の既定が変わる**ため、PR1に含めて、変更点として報告する。

そのほか、ヘッダーの「← アカウントへ」「キャスト一覧」、最大6人・ゲスト最大12人・非公開を含むと公開できない、は今のまま
引き継げる(`validateSelectedCasts` と `hasPrivateCast` が持っている)。

## 7. 手動キャストの画像

### 7.1 今の手動キャスト

手動枠の画像は固定のプレースホルダー(`assets/placeholders/scan-failed.webp`)。`showcase_data.casts[].imageUrl` には
その相対パスが入り、復元は画像を戻さない(`fillManualIdentity` が名前・スタイル・メタだけ戻す)。公開ページの
`safeImageUrl` は `http(s):` と `data:image/` を通すので、画像URLを入れれば表示はできる。

### 7.2 ゲスト画像と同じ仕組みを使えるか — **使える**

ゲストの画像(`js/showcase-guests.js`)は次のとおり。

| 項目 | 内容 |
|---|---|
| バケット | `character-images`(公開バケット。キャスト画像と共用) |
| 形式・サイズ | JPEG / PNG / WebP、1MB以下(クライアントで確認。バケット側も `file_size_limit = 1048576` と許可MIMEで強制。`supabase/32_character_image_upload_limits.sql`) |
| 保存先のパス | `<auth user id>/act-guests/<uuid>.<jpg|png|webp>`、`upsert: false`、`cacheControl: 31536000` |
| 表示用URL | `getPublicUrl` の公開URL。ゲストなら `act_showcase_guests.image_url`(1000文字まで) |
| 差し替え・外す | 新しい画像を上げたあと古いパスを `remove`。「画像を外す」も `remove`(どちらもベストエフォート。失敗は無視) |

実DBを読み取り専用で確かめた結果(2026-11-08、`koprmbkoftuuffslhsvt`):

- バケット `character-images`: `public = true`、`file_size_limit = 1048576`、`allowed_mime_types = {image/jpeg, image/png, image/webp}`。
- `storage.objects` のポリシー: INSERT「Users can upload character images」(`authenticated`、`bucket_id = 'character-images'` かつ
  `(storage.foldername(name))[1] = auth.uid()::text`)、DELETE `character_images_delete_own`(同じフォルダ条件と `owner_id = auth.uid()`)。
  **自分のフォルダの下ならサブフォルダは自由**なので、`<uid>/act-manual/<uuid>.<ext>` に置ける。

→ **migration も Storage の設定変更も要らない。** 実DBへの適用は発生しない。

### 7.3 設計

- **保存先**: `<uid>/act-manual/<uuid>.<ext>`(ゲストの `act-guests` と分ける。掃除のときに種類を見分けられる)。
- **ひもづけ**: 手動枠の `character.image_url` に公開URLを入れる。生成HTMLの `.cast-card__image img` の `src` になり、
  `showcase_data.casts[].imageUrl` として保存される。`showcase_data` の形は変わらない(値がプレースホルダーから公開URLに変わるだけ)。
  画像URLの欄(任意)に、アップロードせず外部のURLを入れることもできる(URLを優先、ファイルを選ぶとURLを上書き)。
- **復元**: 再編集のとき `fillManualIdentity` が `savedCast.imageUrl` を読んで手動枠に入れる(プレースホルダーなら入れない)。
  これは `showcase-edit-restore.js` の変更で、旧データ(プレースホルダー)も今と同じ値になる。
- **HTML書き出し**: 手動キャストの画像は公開URLなので、HTMLにそのまま入る(ダウンロードしたHTMLは、公開バケットのURLを読みに行く)。
  非公開キャスト(`visibility = private`)を含むアクト紹介は、今のとおり公開できない。手動枠の画像は「非公開キャスト」とは別で、
  公開バケットに置かれる点を、アップロードの横に注記する(「アップロードした画像は公開されます」)。
- **要らなくなった画像の消し方**:
  - その場で: 「画像を外す」「差し替え」「手動枠の削除」「キャストを外す」で、その行が持つパスを `remove`(ゲストと同じ)。
  - 行が持つパスは、アップロード直後はクライアントが知っている。**復元した枠**は、URLが
    `…/storage/v1/object/public/character-images/<uid>/act-manual/…` で、先頭が自分のIDのときだけ、URLから
    パスを取り出して消す(他人のURLや外部URLには `remove` しない)。
  - **取りこぼしが残る場面**(ゲストの画像にも今ある): アップロードしたあとにページを閉じる、公開済みのアクト紹介を
    「公開を取り下げる」(`delete_owned_act_showcase` は行を消すだけでStorageには触れない)、復元した枠のうちURLが自分のものでない場合。
    アカウント削除では `delete-account` が `<uid>/` を再帰的に消すので、残らない。
  - 追加の掃除(取り下げ時にStorageも消す、など)は migration ではなくクライアントの処理で足せる。今回のスコープに入れるか
    を§9で確認する。
- **現行の不具合メモ(直さない)**: 復元したゲストは `storagePath` が空で読み込まれるため、その画像を差し替え・削除しても
  古いオブジェクトは消えない(取りこぼし)。手動枠の画像では上の「URLからパスを取る」方式で避ける。
- **サイズ**: クライアントで1MBを確かめ、バケット側でも拒否される。リサイズ・圧縮は今のゲストにも無いので、同じにする。
  `showcase_data` は500KBが上限で、画像は公開URLなので影響しない(`data:` URLにすると上限を超えるので使わない)。

## 8. PRの分け方(提案)

決定事項の4本の前に、見た目を変えないPRを1本足した5本。各PRは、見た目が変わる場合は基準画像のPRを直前に入れる。
本番への同期はしない。

| PR | 内容 | 見た目 | 画面比較 |
|---|---|---|---|
| 1. 公開の流れ | 公開が自動で生成してから公開する(§6-1)。公開ボタンの有効/無効を「生成済み」ではなく「公開できる条件(アクトタイトル、公開キャスト1人以上、非公開を含まない)」で決める。`pageTitle` の既定を `#act-name` にする(§6-7)。E2E: 生成せずに公開、入力変更後の再生成、非公開で公開不可、旧データの復元で同じ値 | 変えない | 変わらない |
| 2. 骨組み | ヘッダーと「公開済みを編集」の帯、3列と左のナビ(状態の表示つき)、区画の並べ替え、01 アクト情報(詳細設定を畳む)、04 公開の欄(sticky、確認リスト、設定の要約)、「HTMLを書き出す」画面(`#showcase-preview` は常にDOMに置く)。足し込み先の直し(§4-4・§6-6)、`showcase-guests.js` の番号書き換えを止める | 大きく変わる | 生成画面の4枚を更新 |
| 3. キャスト | 02 キャスト: 出演順の一覧(つまみ、サムネイル、バッジ、ハンドアウトの開閉)、一言を行の値に持たせ直す(§6-2)、公開/非公開の切り替え、候補カード、手動追加のフォーム(画像なし)、ゲストのカード | 大きく変わる | 4枚 + 状態を足すか決める |
| 4. 見せ方 | 03 見せ方: テーマのカード、背景のサムネイル(自分の画像を畳む)、演出の構成の開閉とボタン、パターン名の表(§6-5) | 変わる | 4枚 |
| 5. 手動キャストの画像 | 画像の枠(ドロップ/クリック)、画像URLの欄、アップロード・差し替え・削除、復元(§7)、E2E | 手動追加フォームのみ | 手動追加フォームを撮るなら足す |

並べ替えの理由: 公開の流れ(1)は、見た目に関係しない動作の変更で、E2Eで単独に確かめられ、以降のPRで公開ボタンの
状態が変わっても土台になる。骨組み(2)で3列にしたあと、キャスト(3)と見せ方(4)は独立して進められる。手動画像(5)は
手動追加フォームがPR3で完成してから足す。

### 実装の結果

- **PR1 公開の流れ(2026-11-08)。** 公開ボタン(`[data-publish-mode]`)の押下が、生成HTMLが無いときだけ自分で生成してから
  同じ押下をやり直す。実装は `js/showcase-publish-flow.js`(押下を横取りして再生)と `js/showcase-generation-settle.js`
  (`#generate-button` を押し、`#showcase-preview` の `srcdoc` の変更とその `load` が止まって120ms動かなくなるまで待つ。
  生成が失敗したら `#generator-status` の `is-error` で止まり、理由は生成側が書く)。読み込みはゲスト区画のあと、ゲストの
  保存(bridge)と公開(dynamic publish)の前。公開ボタンは、公開中・生成中・非公開キャストを含むときだけ無効で、
  「生成済みかどうか」は見ない(旧 `#publish-button` の `disabled` を見る仕組みは外した。旧ボタン自体は、`output-rendering` の
  テストが頼る有効/無効の動きとともに残している)。サブタイトルを変えても公開ボタンは無効にしない(出力を空にするだけ)。
  ページタイトルの欄は既定が空で、空のとき生成が `#act-name` を使う(復元は保存された値をそのまま入れる)。
  テスト: `tests/e2e/showcase-generator-publish-flow.spec.js`(偽ログインの生成画面。生成せずに公開・ゲスト保存が公開より前・
  入力変更後は新しい内容を公開・生成済みの再利用・失敗理由の表示・非公開で無効・HTML書き出し)と
  `tests/showcase-publish-flow-contract.test.mjs`。**気づいた点**: ページタイトルが空のとき、公開ページの `heroTitle` も
  アクトタイトルになる。スタンダード版の見出し(`h1`)とアクト名の行が同じ文字になりうる(公開ページ側は触っていない)。

- **PR2 骨組み(2026-11-08)。** `showcase-generator.html` を、ヘッダー(← アカウントへ / タイトル / 公開済みを編集・キャスト一覧)、
  「公開済みを編集」の帯、3列(手順のナビ | 入力 | 公開)に作り直した。**1200px以上で3列、未満は縦に積む**
  (ナビ → 入力 → 公開。1000〜1199pxで3列にすると入力列が狭くなりすぎるため、旧ページと同じ1200pxを境にした)。
  - 帯は静的HTMLに置き、`showcase-edit-restore.js` は既にあればそれを使う(`?edit=` で来たときは進み具合が見えるよう自動で開く)。
    取り下げのボタンの文言は「公開を取り下げる」(動作・確認ダイアログ・`#delete-owned-showcase` は同じ)。
  - ゲスト区画は「02 キャスト」の中の `#showcase-guest-host` に入り、公開の欄の番号を書き換えない。アクトタイトルの欄・
    サブタイトル・RULER/SCENARIO WRITER・識別名とページタイトル(「詳細設定」に畳む)は最初からHTMLに置いた。文字数は `8 / 40`。
  - 公開の欄: 確認リスト、「豪華版で公開」(主)、「スタンダード版で公開」、「ほかの操作」(HTMLを書き出す・履歴だけ登録)、今の設定の要約。
    **「HTMLを書き出す」は `<dialog id="html-export-dialog">` を開き、開いたとき生成が無ければ生成する**。`#generate-button`・
    `#download-button`・`#copy-button`・`#showcase-preview` はこのダイアログの中(閉じている間は見えないがDOMにあり、公開はここを源にする)。
    `#generator-status` は公開の欄に1つだけ置き、ダイアログには同じ内容を写す(`#html-export-status`)。
  - 状態の表示は `js/showcase-generator-shell.js`(DOMを読んで表示するだけ)と、純粋関数の `js/showcase-generator-summary.js`
    (手順の状態、確認リスト、設定の要約、演出の構成の要約 `B:タイトル・ACT READY / ほかは A`)。演出の構成の要約はPR4でも使う。
  - CSS は新しい `css-next/pages/showcase-generator-layout.css`(直書きの色0)。02 キャストの行は、入力列が狭くなったぶん、
    旧ページの1200px未満と同じ配置にした(PR3で作り直す)。
  - テスト: E2E `showcase-generator-shell.spec.js`(帯・`?edit=` の復元・手順の状態・確認リスト・書き出し・ゲストの位置・3列/縦積みと横あふれなし)、
    単体テスト `showcase-generator-summary.test.mjs`。PR1のE2Eと `output-rendering` は、生成ボタンがダイアログの中に移ったので
    ダイアログを開く操作を足した(確かめる内容は同じ)。

- **PR3 キャスト(2026-11-09)。** 「02 キャスト」を、出演順の一覧 → 「キャストを追加」の枠 → ゲストの順に作り直した。
  - **出演順の行**(`js/showcase-cast-row.js` が行と候補カードのマークアップを作る純粋関数、状態とイベントは `showcase-generator-v3.js`):
    つまみ・CAST番号・縦長サムネイル(`image_thumbnail_url`→`image_url`、丸くしない)・ハンドルと名前・スタイル・PL・ハンドアウトのバッジ
    (入力済み/未入力)・「ハンドアウト」(開閉)・↑↓・×。開くと CAST No・参加枠・一言・ハンドアウト本文(項目は今のまま)。開閉は選択のモデル
    (`item.open`)が持ち、再描画しても保つ。行の属性(`data-selected-index`・`data-character-id`・`data-visibility`・`data-manual`・
    `data-action`・`data-field`)は変えていない(§4)。
  - **並べ替え**: つまみのドラッグ(HTML5 のドラッグ&ドロップ)、つまみにフォーカスして ↑↓ キー、行の ↑↓ ボタン。タッチ端末は ↑↓ ボタンを使う。
  - **一言はキャストごとに持つ**: `selectedCasts` の要素の `tagline`(`data-field="tagline"` の値)。`showcase-tagline.js` は行番号の配列をやめ、
    生成のときに行(並び順)から読む。公開データ(`casts[].tagline`)の形は変わらず、旧データの復元(`data-field="tagline"` へ値を入れる)は
    同じキャストに同じ一言が入る(E2E: 順番の違う保存データで確認)。
  - **キャストを追加**: 「公開キャスト / 自分の非公開キャスト」のタブ(`#public-cast-grid` と `#owned-private-cast-grid` は別々のまま、
    見えるのは片方だけ。復元は公開のカードを押すので、公開タブが既定)、検索・プレイヤー・スタイルは1組で両方の一覧に効く、候補カードは
    小さく「追加済み」を出す。非公開タブには「非公開キャストを含むアクト紹介は、HTMLの書き出しだけできます」。
  - **手動で追加**: `#add-manual-cast` は追加フォームを開く(ハンドル・キャスト名・スタイル・PL名・倉庫取込・「詳細」=所属/年齢/性別/市民ランク、
    注記、「出演順に追加」「やめる」)。名前が空なら追加しない。追加した行は開いた状態で、ハンドアウトにフォーカスする。**画像の枠はPR5**。
    保存済みのアクト紹介の復元は、フォームを開く代わりに `tnx:showcase-add-manual-cast` のイベントで空の手動行を作り、今までどおり
    行の `manual-*` 欄へ値を入れる。手動行の開いた中に、名前・スタイル・PL名・ハンドル・「詳細」の欄があり、あとから直せる。
  - **手動キャストのハンドル(新しい入力)**: 書き出すHTMLの名前の前に「“ハンドル”」を出す(ハンドルが空なら今までどおり名前だけ)。
    `showcase-output-html.js` の手動キャストの名前の作り方を、ハンドルがあるときだけ `formatFullName` にした。
  - **ゲストのカード**: 小さなカード(画像・GUEST番号・名前・ハンドルとスタイル)で、開くと今の編集欄。開閉は `guest.open` が持つ。
    保存・画像のアップロード・RPCは変えていない。
  - CSS: 新しい `css-next/pages/showcase-generator-cast.css`(直書きの色0)。旧 `showcase.css` の行・候補カードの規則は消した
    (直書きの色の上限を下げた)。PR2の仮の行の規則(`showcase-generator-layout.css`)も消した。
  - テスト: E2E `showcase-generator-cast.spec.js`(行・開閉とバッジ・並べ替えで一言/ハンドアウト/参加枠がキャストについていく・
    生成カードの順と一言・上限6・タブとフィルタ・手動フォーム・手動のハンドル・旧データの復元・ゲストのカード・横あふれなし)。
    既存のテストは、参加枠などを選ぶ前に行を開く操作と、非公開タブを押す操作を足した(確かめる内容は同じ)。契約テストは、行・候補カードの
    読む場所(`showcase-cast-row.js`・`showcase-generator-cast.css`)と、手動追加のイベントに合わせた。

- **PR4 見せ方(2026-11-09)。** 「03 見せ方」を、テーマのカード・背景・演出の構成の3つのブロックに作り直した。保存値の欄
  (`#showcase-theme`・`#background-preset`/`#background-url`/`#background-file`・`#showcase-scenes`)の `id` と値の形は変えていない。
  - **紹介テーマ**: 4枚のカード(色見本4つ・日本語名・英字名)。選んだカードを枠で示す。`#showcase-theme` の `<select>` は
    `hidden` で残り、カードの選択が値を入れて `change` を飛ばす(再生成が必要になる印が付く)。復元が `select` に値を入れて `change` を
    飛ばすと、カードの印が動く。矢印キーで選べる。色見本は、書き出すHTMLのテーマの配色表(`js/showcase-output-css.js` の
    `getThemeSwatchColors`。配色表を `THEME_PALETTES` に切り出しただけで、色は増えていない)から取る。「HTML・スタンダード版・豪華版で共通です」の注記。
  - **背景**: 選んだ1枚を大きく見せる(`#background-current`: 番号・名前・説明。個別指定ならURL/ファイル名)。プリセット10枚は5列のサムネイル
    (名前は `title`/`aria-label`)。URLとファイルは「▸ 自分の画像を使う(URL・ファイル)」に畳み、「URLが入力されている場合はURLを優先します。公開時は容量上限に
    収まるよう自動圧縮します」の注記は残した。プリセットを選ぶと、これまでどおり URL欄にそのURLが入り、キー欄にキーが入る。
  - **演出の構成**: 畳んだ枠(`<details id="showcase-scene-composition">`)。見出しに「豪華版のみ」の印と要約(`すべて A(標準)` /
    `B:タイトル・ACT READY / ほかは A`)。開くと6つの場面ごとに「A 標準 / B:<パターン名>」のボタンと「すべて A に戻す」。`<select data-scene-frame>`
    はボタン(`button[data-scene-frame][data-scene-pattern]`、`aria-pressed`)に替わった。**保存値(`#showcase-scenes` の JSON)の形、
    「a を選ぶとその場面の項目を消す」「新しいスクリプトが保存した、その場面がまだ再生できないパターンは編集しても残る」は同じ**。
    パターン名の表は `SCENE_PATTERN_NAMES`(起動ターミナル・タイトルカード・縦組み・ポートレート先行・ポートレート中央・キービジュアル。
    資料 §6 で決めた名前)。新しいパターンを足すときは、`act-showcase-scenes.js` の `PLAYABLE_PATTERNS` と、この表に名前を足す(なければ「パターン C」と出る)。
    「すべて A に戻す」は、ボタンで見えている(その場面が再生できる)ものだけを a に戻す。
  - 公開の欄の「今の設定」の背景は、プリセットのキーがあればプリセット名、なければURL、ファイルの順(プリセットを選ぶとURL欄にもURLが入るため)。
  - CSS: 新しい `css-next/pages/showcase-generator-look.css`(直書きの色0。色見本の色だけ `--swatch` で JS から渡す)。旧 `showcase-background-presets.css` は
    置き換えて消した(直書きの色の上限が下がった)。
  - テスト: E2E `showcase-generator-look.spec.js`(テーマカード・背景・ファイル・演出の構成・復元と公開・横あふれなし)。
    `showcase-scene-selector.test.mjs` と `tests/e2e/showcase-scene-selector.spec.js` は、`select` からボタンに書き換えて同じ内容を確かめる
    (選ぶと欄に書く・a で消える・復元でボタンが動く・未対応のパターンは残る・往復)。`tests/helpers/fake-dom.mjs` にボタン用の最小の機能を足した。
    プリセットの E2E は、名前を `title` から読む形に。

- **PR5 手動キャストの画像(2026-11-09)。** §7 の設計どおり、migration も Storage の設定変更も無しで入れた(実DBへの適用は無い)。
  - **追加フォーム**: 左に画像の枠(ドロップかクリックで選ぶ。JPEG/PNG/WebP、1MB以下)、下に「画像URL」(任意。ファイルを選ぶとそのURLが入る。URLを打ち直すと
    アップロードしたファイルは使わなくなる)、「画像を外す」、「アップロードした画像は公開されます」の注記。手動行の開いた中にも、同じ画像の欄(プレビュー・画像を選ぶ・画像を外す・画像URL)がある。
  - **保存先と取り扱い**: `js/showcase-manual-image.js`(純粋関数と Storage 呼び出し)。バケット `character-images`、パス `<ユーザーID>/act-manual/<uuid>.<拡張子>`、
    `upsert: false`。手動行の `character.image_url` に公開URLが入り、書き出すHTMLの `.cast-card__image img` から `showcase_data.casts[].imageUrl` に入る(形は同じ)。
    HTML書き出しにも同じ公開URLが入る。
  - **消し方(設計を一部詰めた)**: 「アップロードしたが、まだ公開に使われていない」ファイルは、外す・差し替え・フォームをやめる・URLを打ち直す・キャストを外す、のどれでもその場で消す。
    **公開済みのアクト紹介が今も見せているファイル**(復元で戻したURL、またはこの画面から公開したあとのファイル)は、その場では消さず、**次の公開が成功したあと**に消す
    (`tnx:showcase-published`)。その場で消すと、再公開の前に公開ページの画像が切れるため。復元は `tnx:showcase-restore-start` で「ここでアップロードしたが未公開のファイルを消して台帳を作り直す」ので、
    復元のために行を消しても、直前に開いていたアクトの画像は消えない。消すのは、URLが自分の `act-manual/` 直下のファイルだと確かめたものだけ(ゲストの画像・登録キャストの画像・外部URL・他人のファイルには触れない)。
    取りこぼしは、アップロードしたままページを閉じた場合と、「公開を取り下げる」(決定どおり Storage には触れない)。アカウント削除は `<uid>/` ごと消す。
  - **テスト**: 単体テスト `showcase-manual-image.test.mjs`(形式・サイズ・パス・URLからのパス・アップロードと削除・台帳)、E2E `showcase-generator-manual-image.spec.js`
    (アップロード先のパス・URL・行とHTMLへの反映・拒否・やめる/打ち直す/外すでその場で消える・差し替え/外す/キャストを外すで消える・外部URLには触れない・復元した画像は公開後に消える・
    ゲストの画像は消さない・公開に載る・横あふれなし)。生成画面のE2Eのヘルパーは、オプションを渡すと公開の既定の応答を消す不具合を直した(アプリではなくテスト側)。
  - **画面比較に足した状態**: 「公開キャスト3人を選び、1人のハンドアウトを開いた状態」の1つだけ(決定どおり。手動フォームの画像はE2E)。基準ブランチの `tests/visual/showcase-generator-cast.visual.spec.js`(2テーマ × desktop/mobile の4枚。手動キャストの画像の枠が無いページでは skip するので、先にspecだけをマージし、画像はこのPRのCIの成果物から作った)。実装の5本はこれで終わり。 撮影では、スクロールバーを隠し(spectrum-neonのつまみの色が位置で変わる)、spectrum-neonだけテーマのアニメーションを切る(右端のレールなどの色の位相が撮影ごとに違い、モバイルが右端3pxの差で落ちた)。画像は4回に分けて入れ直した。

### 各PRの確認

- どのPRも `npm run verify` と `npm run check:js`、JS/CSS/HTMLを変えたら `npm run version:update`。
- 新しいCSSは直書きの色を0にする(§5.1)。同じセレクタの規則を別に足さない(`audit:css`)。表の列の順や幅は触らない。
- 見た目のPRは、模擬ログイン(`installVisualEnvironment(page, { authenticated: true })`)で開いて、1440pxと1024pxの2枚、
  狭い幅で縦に積まれることを390pxで1枚、確認する。マージ前にスクリーンショットを見せる。

## 9. 判断してほしい点

1. **一言／キャッチコピーを、ハンドアウトの行の開いた中に残す**(§6-2)。消すとデータが落ちる。これでよいか。
2. **公開は自動で生成してから行う**(§6-1)。生成前は公開できない今の挙動から変わる。これでよいか。
3. **ページタイトルの既定をアクトタイトルにする**(§6-7)。保存される `pageTitle` の既定値が変わる。
4. **「公開を取り下げる」でStorageの画像も消すか**(§7.3)。今のゲストの画像も消えない。今回は手動画像の差し替え・削除のときだけ消し、
   取り下げ時の掃除は別の判断にするのが安全、という案。
5. **画面比較の状態を足すか**(§5.2)。キャストを選んだ行・手動追加フォームなどの撮影を足すかどうか。
