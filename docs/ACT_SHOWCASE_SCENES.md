# ACT SHOWCASE 画面枠(シーン)対応表

調査のみ(コード変更なし)。基準: main `10ba80f`。数値は正規表現による機械集計(手順は第7節)。「未確認」は推測または未検証。

計画の前提: 演出を「7つの画面枠 × 各3パターン(A/B/C)」の組み合わせにする。枠の順番は固定。今の演出を「全枠パターンA」として切り出し、見た目は変えない。構成情報のない既存のアクト紹介は全枠Aで再生する。

CSSの層の一覧・重複・死んだ宣言、JSの読み込み順・MutationObserver の一覧、守りになっているテストは [`ACT_SHOWCASE_LAYERS.md`](ACT_SHOWCASE_LAYERS.md) にある。ここには繰り返さず、「枠」という切り口で必要な分だけ参照する(以下 LAYERS §n と書く)。

## 0. 要点

- **名前の衝突。** コードの `finale`(`act-showcase-finale-enhancer.js`、`.neotokyo-sequence__screen--finale`、`.neotokyo-finale__*`、`body.showcase-neotokyo-finale-active`)は、計画でいう **ACT READY**(サマリー画面)を指す。計画の **フィナーレ** は、導入演出が終わったあとのページ本体(ヒーロー `#scene-opening` と最終ボード `#poster-showcase-board-v2`)。以下はこの対応で書く。呼び名は第6.1節で決定済み。
- **ハンドアウトとキャストアサインは同じDOM。** PCごとに1つの `section.neotokyo-sequence__screen--linked` があり、アサインはその要素への状態クラスの追加(`is-read` → `is-splitting` → `is-searching` → `is-found` → `is-assigned`)で進む。画面の差し替えは起きない。しかも PC の人数分(1〜6回)「ハンドアウト→アサイン」が交互に繰り返される。「同じ枠は1回だけ使う」は「枠のパターンは1回だけ選び、全PCに同じものを使う」と読み替える必要がある。
- **ローディングの前半はパターンを選べない。** 最初の読み込み画面(`act-showcase.html` に書かれた静的な `.cinematic-intro__*`)は、公開データ(=構成情報)を取得する前に出る。選べるのは、データ取得後のアクセス画面(`01 // ACT FILE // ACCESS`)だけ。テーマも同じ事情で、URL に `&theme=` がないとデータ取得まで既定の nova で出る。
- **テーマはページ全体に1つ。** `<html data-showcase-theme>` に1つだけ付き、豪華版の6つのCSSで `:root[data-showcase-theme…]` から始まるセレクタが782個ある(テーマ4本で702、core で80)。アクトごとにテーマを選ぶのは今の仕組みのまま使えるが、枠ごとに変えるには変数の置き場所を `:root` から枠の要素へ移す必要がある。
- **背景は今はフィナーレだけ。** `--showcase-background` を使うのはヒーロー・最終ボード・最終ボードのトレーラー枠・`ambient-stage` だけで、導入演出の6枠には出ない(LAYERS §1 の top-background-only)。枠ごとに背景を選ぶのは新しい機能になる。
- **フィナーレのDOMは最初から裏にある。** `act-showcase-page.js` がデータ取得直後にヒーローと最終ボードを作り、導入演出のオーバーレイ(`#cinematic-intro`)の下に置く。フィナーレ用の observer はその間も動いている。
- **CSSの層は枠ごとに分かれていない。** 31の元ファイルのうち、7枠のうち1枠だけを対象にしているのは8ファイル、3枠以上にまたがるのは18ファイル。複数の枠を1つのセレクタ群でまとめたルールが97個ある(第3節)。
- **直書きの色は1,210個。そのうち1,146個(95%)はテーマ層以外(core / scenes)にある。** 枠ごとの内訳は第4節。(調査時の測定で、引数が変数の `rgba(var(--x-rgb), a)` は数えていない。歯止めの数え方との違いは第4節の冒頭)
- 画面比較は、豪華版の4テーマ × 2幅 × 13状態を、6つの枠IDの名前で撮影している(第6節 #1、基準ブランチ #606。範囲は LAYERS §4.1)。調査時点では desktop の8状態だけで、mobile の3テーマ・PC2 以降・フィナーレのヒーローは撮っていなかった。

## 1. 7枠と今の実装

進行の本体は `js/act-showcase-neotokyo.js` の `runNeoTokyoIntro`。`showOpening` → `showActTitle` → `showTrailer` → PCごとの `showHandoutAndAssign` → `showSummary` を順に `await` する。画面の差し替えは `swapScreen` が1つにまとめている(`stage.replaceChildren` → `rAF` で `is-visible` → ノイズ演出 `is-screen-swap`)。

「後から書き換える側」は、本体が作ったDOMを observer で見つけて装飾する層(LAYERS §3.2・§3.3)。CSS は元ファイル名で書き、括弧内はその枠に当たるルールの数(第7節の集計)。上位だけを挙げる。

| 枠 | DOMの範囲 | 作る側(JS) | 後から書き換える側(JS) | 主なCSS(元ファイル、ルール数) | 次の枠へ進む仕組み |
|---|---|---|---|---|---|
| 1 ローディング | 前半: `#cinematic-intro.cinematic-intro` の静的な `.cinematic-intro__scan/__inner/__overline/__title/__sub`(HTMLに直書き)。後半: `section.neotokyo-sequence__screen--opening`(`__opening-title` `__opening-sub` `__bootlog`)。エラー時の表示先は `#act-showcase-status` | 前半: HTML と `act-showcase-page.js` `prepareNeoTokyoLoading`。後半: `act-showcase-neotokyo.js` `showOpening` / `replaceStage` | `act-showcase-cinematic-enhancer.js` `enhanceAccess`(`is-cinematic-access`、`__access-seal` の `is-authorized`) | cinematic 13、theme-surface-system 10、act-showcase 9(`.cinematic-intro__*`) | 前半 → 後半: 公開データの取得完了で `intro.replaceChildren(shell)`。後半 → 2: `wait(state, 2900)` のタイマーで自動 |
| 2 タイトル | `section.neotokyo-sequence__screen--title`(finale-enhancer が `--title-logo` を足す) | `showActTitle` | `finale-enhancer` `decorateTitle`(meta / ghost / rule、`data-fit`、`body.showcase-neotokyo-title-logo-active`。同期で実行、LAYERS §3.4)、`cinematic-enhancer` `enhanceTitle`、`cinematic-layout-v2` `enhanceTitleScreen`(副題)、`scenario-writer` `syncTitleCredit`、`story-flow` `decorateTitle`、`cinematic-polish`(文字フィット) | finale 23、theme-scene-contract 18、title-cyberpunk 17、cinematic-v2 12、hierarchy 11、theme-legibility 11 | `waitForAdvance("NEXT // ACT TRAILER")`(ボタンかステージのクリック) |
| 3 アクトトレーラー | `section.neotokyo-sequence__screen--trailer`、`.neotokyo-sequence__readout--split`(既読/未読の2 span) | `showTrailer` / `prepareSplitReadout` / `typeSplitReadout`(最長4.2秒) | `cinematic-layout-v2`(`data-typing` の間の枠の高さと追従スクロール、`stage.is-trailer-scroll`、`body.showcase-trailer-document-scroll`)、`cinematic-enhancer` `enhanceTrailer`、`writing-patterns` `armTrailerPattern`(`--trailer-lines`)、`story-flow` `decorateTrailer`(outro) | story-flow 17、cinematic 13、theme-phase-contract 13、theme-surface-system 13、visual-emphasis 13 | 読み上げ終了 → `waitForAdvance("NEXT // HANDOUT 01")` |
| 4 ハンドアウト | `section.neotokyo-sequence__screen--linked` の `__handout-panel`、`__link-bridge`、待機中の `__assign-panel`。`__linked-head` はアサインと共有 | `showHandoutAndAssign` の前半、`typeReadout`(最長2.4秒) → `is-read` | `handout-live-frame`(`stage.is-handout-scroll`、`--showcase-handout-live-height`、ResizeObserver)、`writing-patterns`(context cells を `replaceChildren`)、`story-flow` `decorateLinked`(ROLEセル) | neotokyo-linked 44、story-flow 32、theme-scene-contract 15、theme-surface-system 12 | `waitForAdvance("ASSIGN // PCn")` |
| 5 キャストアサイン | 4と同じ `section`。状態クラスで進む: `is-splitting`(780ms)→ `is-searching`(850ms)→ `is-found`(560ms)→ `is-assigned`。`__assign-panel` の中身を `__search--linked` → `__cast--linked` に差し替え、スタイルカードをめくる | `showHandoutAndAssign` の後半、`createAssignedCast` / `createStyleRow` / `startStyleCardFlip`(LAYERS §3.6) | `scroll-cue`(`is-splitting` を監視)、`story-flow`(assigned-route・entry-vectors)、`supporting-cast` `repairNeoTokyoRoles`、`cinematic-layout-v2` `polishAssignedPresentation` | story-flow 61、neotokyo-linked 54、neotokyo 31、theme-surface-system 25、assign-cards 20(+theme 7)、theme-phase-contract 17、followup-v1 15 | `waitForAdvance("NEXT // HANDOUT 0n")` で次のPCの**4へ戻る**。最後のPCは `"NEXT // ACT SUMMARY"` で6へ |
| 6 ACT READY | `section.neotokyo-sequence__screen--summary`(finale-enhancer が `--finale` を足す)と、共有フッターに足されるアクセスボタン `.neotokyo-finale__access-button` | `showSummary` | `finale-enhancer` `decorateSummary`(lockup・core・cast bay・links・ASSIGNED・signal、`body.showcase-neotokyo-finale-active`)、`supporting-cast`(見出しを FINAL BRIEFING に書き換え、ゲスト、ロール強調)、`scenario-writer` `syncSummaryCredit`、`story-flow` `decorateSummary`、`cinematic-polish` `decorateSummaryAccess`(ボタン生成)、`board-layout` `polishAccess`(ボタン文言とマーカー) | finale 71、neotokyo 47、theme-surface-system 41、theme-phase-contract 30、layout-polish 19、supporting-cast 18 | `waitForAdvance("OPEN FULL SHOWCASE")`。`summary-advance-guard` がステージのクリックを止めるので、アクセスボタン(隠れた NEXT ボタンを `click()` する)だけで進む → `finish()` で `aria-hidden=true` → `act-showcase-page.js` `finishIntro(0)` が `is-hidden`、850ms後に `#cinematic-intro` を削除 |
| 7 フィナーレ | `#act-showcase-root` 全体: `.ambient-stage`、ヒーロー `#scene-opening`、最終ボード `#poster-showcase-board-v2`(LAYERS §3.5)、`#poster-final-act-trailer`、`#poster-supporting-cast`、`footer.footer` | `act-showcase-page.js` `renderOpening` / `renderPoster` / `applyBackground`(**データ取得直後、1より前に作る**)、`initializeMotion`(スクロール連動の `--poster-v2-*`) | `board-layout`、`final-trailer`(挿入)、`supporting-cast`(ゲスト、ロール強調)、`scenario-writer` `syncOpeningCredit`、`cinematic-polish`(文字フィット)、`display-normalizer`(タグライン) | layout-polish 105、poster-v2 87、theme-surface-system 83、ornament-plus 76、act-showcase 51、theme-legibility 51、ornament 50 | 終点(スクロールのみ)。どの枠からでも SKIP(`finish()`)でここへ飛ぶ |

補足:

- 進行用のタイマーは `wait()` に1本化されていて、SKIP・終了時は `state.resolveWaiters()` で全部解決される。枠の外のタイマー(`finishIntro` の 850ms、`startStyleCardFlip` の `setTimeout`、各 observer の `rAF`)はこの仕組みに入っていない。
- reduced-motion は `body.showcase-neotokyo-reduced` の1クラスで全枠に効く(LAYERS §3.4)。

## 2. 枠をまたいで共有されているもの

### 2.1 状態・タイマー・DOM・変数

| 種類 | もの | 使う枠 | 部品化での扱い |
|---|---|---|---|
| 状態 | `createSequenceState()` の1つのオブジェクト(`finished` / `skipRequested` / `waiters` / `advanceResolver` / `stage` / `progress` / `advanceButton`) | 1後半〜6 | 枠の部品に渡す共通の「進行コンテキスト」として残す(各枠が持つものではない) |
| DOM(枠の外側) | `neotokyo-sequence__shell` > `__header`(ブランド・system・SKIP)/ `__stage` / `__footer`(進捗・NEXT・著作表示) | 1後半〜6 | 7枠すべての外枠。パターンが変えてよいのは `__stage` の中身だけ、という線を引くのが前提になる |
| 進捗 | `setProgress` の値と文言を各枠が直書き: 5 / 18 / 30 / 34+(PC位置×50)/ +5 / +10 / 100 | 1〜6 | 枠の順番と人数に依存。パターンBで変えると進捗の連続性が崩れる。枠ごとの値を外から渡す形にする必要がある |
| 番号 | 見出しの `01 //` 〜 `06 //` を各枠が直書き(`04 // HANDOUT 01 // PC1 → 05 // ASSIGNMENT 01` など) | 1〜6 | 同上 |
| bodyのクラス | `showcase-neotokyo`、`-intro-active`、`-reduced`、`-title-logo-active`(2)、`-finale-active`(6)、`showcase-trailer-document-scroll`(3)、`showcase-poster-v2-ready`(データ取得後ずっと) | 全枠 | `-finale-active` を条件にするルール26個のうち12個は共有の外枠(フッター・ヘッダー・ステージ等)を変える。`showcase-trailer-document-scroll` は10個のうち5個が `html` / `body` を変える。枠のクラスが外枠の見た目を持っている |
| stageのクラス | `is-awaiting-advance`、`is-screen-swap`、`is-trailer-scroll`(3)、`is-handout-scroll`(4) | 1〜6 | ステージは共有なので、枠固有のクラスの付け外しを枠の終了時に確実に戻す必要がある(今は `swapScreen` と各 observer に分散) |
| CSS変数 | `--neotokyo-progress`(進捗)、`--showcase-background`(body、フィナーレのみ使用)、`--trailer-lines`(3)、`--showcase-handout-live-height`(4)、`--flip-turn` / `--flip-gap`(5)、`--poster-v2-*`(7、スクロール連動) | 枠ごと | 枠固有の変数は既に枠ごとに分かれている。共有は進捗と背景だけ |
| テーマ | `<html data-showcase-theme>` と `style.colorScheme`(`act-showcase-theme-runtime.js`)。パレット変数は `:root[data-showcase-theme="…"]` に定義 | 全枠 | 第0節。アクト単位なら現状のまま |
| データ | `model`(`createShowcaseModel`)。ほかに `scenario-writer` / `supporting-cast` / `final-trailer` が同じ公開データを別に読む(`public-showcase-service.js` がslug単位でキャッシュするので通信は1回) | 2・6・7 | 3つの後付け層は、到着時に該当の枠が画面にあるかどうかで結果が変わる(到着前の枠には後から足し、通り過ぎた枠には足さない)。部品化では、この3つの値を `model` に入れて各枠に渡すのが筋 |

### 2.2 ある枠が別の枠のDOM・クラスに依存している箇所

| 依存する枠 | 依存先 | 内容 |
|---|---|---|
| 2 タイトル | 7 フィナーレ | `cinematic-layout-v2` `getMeaningfulSubtitle` が、ヒーローの `#opening-subtitle` の文字からタイトル画面の副題を作る。フィナーレのDOMが先にあることが前提 |
| 7 フィナーレ | 7(自分の文字) | `board-layout` が `#opening-act-name` / `#opening-ruler` の表示文字から act-meta の値を読む(LAYERS §3.3、本体が先に作るので安全網) |
| 6 ACT READY | 共有の外枠 | アクセスボタンを `__footer` に足す。終了まで消さないので、6の後に別の枠が来る構成だと残る。ステージのクリックを止める `summary-advance-guard` も、ステージ内に `--summary` があるかどうかで判定する |
| 6 ACT READY | 2 タイトル | 同じ `finale-enhancer` の1つの observer がタイトルとサマリーの両方を装飾し、body クラス2つを同時に計算する |
| 5 アサイン | 4 ハンドアウト | 同じ `section`。アサインのCSSは `.screen--linked.is-splitting …` のように、ハンドアウトの要素を状態クラスで動かす。逆に `handout-live-frame` のCSSは `.screen--linked:not(.is-splitting)` で「アサインがまだ始まっていない」ことを条件にする。両方にまたがるルール54個 |
| 5・6・7 | 互い | `cinematic-fit` の代替画像ルール3個が `__cast-image`(5)・`__summary-cast-image`(6)・`.poster-v2-visual`(7)を1つのセレクタ群で扱う。`supporting-cast` の `.poster-v2-tags span, .neotokyo-sequence__styles span, .neotokyo-sequence__summary-cast-styles span` も3枠を同時に扱う |
| 1 前半 | 1 後半 | 読み込み画面とアクセス画面の書体・位置を一致させてある(切り替わりで文字の形が変わらないように。LAYERS §3.3、E2E `act-showcase-final-copy` が検査)。片方だけパターンを変えると一致が崩れる |
| 2〜6 | 共有の `.neotokyo-sequence__readout` / `__micro` / `__eyebrow` / `__terminal` / `__section-title` | 複数の枠で同じクラス名を使い回していて、枠の外側の祖先で見分けている。1つの枠向けの修正が、ほかの枠の同名要素にも当たる |
| 全枠 | 各 observer の対象 | 後付け層はクラス名(`--title` / `--trailer` / `--linked` / `--summary`)で画面を探す。パターンBが同じクラス名を使えば A の装飾が勝手に付き、使わなければ付かない。どちらにするかを枠ごとに決める必要がある |

## 3. 枠ごとに独立させるときの障害

### 3.1 上書きの層が複数の枠にまたがっている箇所

元ファイル(LAYERS §1 の層)ごとに、7枠のどれにルールが当たるか。数字はルール数(1つのルールが複数の枠に当たれば重ねて数える)。「共有」= 外枠(shell)、「旧」= 対応するDOMを作るコードがないセレクタ(第7節)。

| 層 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 共有 | 旧 | 枠数 |
|---|---|---|---|---|---|---|---|---|---|---|
| act-showcase(旧ベース) | 9 | | | 1 | | | 51 | 3 | 113 | 3 |
| poster-v2 / cast-selector / ornament / ornament-plus / final-trailer | | | | | | | 87 / 6 / 50 / 76 / 31 | | | 1 |
| neotokyo | 4 | 2 | | | 31 | 47 | | 60 | | 4 |
| neotokyo-linked | | | | 44 | 54 | | | | | 2 |
| neotokyo-hierarchy | 1 | 11 | 2 | | 8 | 17 | 4 | | | 6 |
| cinematic | 13 | 10 | 13 | | 1 | 3 | | 6 | | 5 |
| finale | | 23 | | | | 71 | | | | 2 |
| cinematic-readability | | 8 | | | 8 | 17 | 12 | 1 | | 4 |
| layout-polish | | 6 | | 1 | 11 | 19 | 105 | 1 | | 5 |
| story-flow | | 5 | 17 | 32 | 61 | 7 | 2 | | | 6 |
| writing-patterns | | 10 | 7 | 8 | | | | | | 3 |
| supporting-cast | | 10 | | | 4 | 18 | 28 | | | 4 |
| presentation-tuning | | 7 | | | | 8 | 8 | | | 3 |
| visual-trailer-fix | | | 4 | | | | 2 | | | 2 |
| title-cyberpunk | | 17 | | | | | 4 | | | 2 |
| **cinematic-v2** | | 12 | 5 | | 9 | | 27 | | 1 | 4 |
| cinematic-fit | | 6 | | | 9 | 4 | 4 | | | 4 |
| top-background-only | | | | | | | 2 | | | 1 |
| followup-v1 | | | | | 15 | | 6 | | | 2 |
| handout-live-frame | | | | 8 | 8 | 2 | 13 | 2 | | 4 |
| assign-cards / assign-cards-theme | | | | | 20 / 7 | | | | | 1 |
| theme-surface-system | 10 | 7 | 13 | 12 | 25 | 41 | 83 | 24 | 4 | 7 |
| theme-phase-contract | | 10 | 13 | 1 | 17 | 30 | 5 | 1 | | 6 |
| theme-legibility | 4 | 11 | 3 | 6 | 10 | 9 | 51 | 11 | | 7 |
| theme-scene-contract | | 18 | 9 | 15 | 11 | 1 | | 4 | | 5 |
| visual-emphasis | | | 13 | 3 | | 4 | 5 | | | 4 |

読み取れること:

- **1枠だけの層は8ファイル**(poster-v2・cast-selector・ornament・ornament-plus・final-trailer・top-background-only がフィナーレ、assign-cards・assign-cards-theme がアサイン)。このほかに2枠だけの層が5ファイル(neotokyo-linked・finale・visual-trailer-fix・title-cyberpunk・followup-v1)。これらは枠の部品へ切り出す最初の候補になる。
- **cinematic-v2**(LAYERS §1 で「最終」上書きとされる層。緩い上書き76キー)は、タイトル・トレーラー・アサイン・フィナーレの4枠に当たる。中身は枠ごとに独立した塊(タイトルのロゴ12、トレーラーのスクロール5、アサインのスタイル行9、ポスターの nav・topbar・文字色27)で、相互の依存はない。ただし上書きの相手(story-flow・poster-v2・writing-patterns)が別の枠の層なので、枠ごとに分けると「どの層の何を上書きしているか」を1つずつ追うことになる。
- **handout-live-frame** は名前に反して4枠+共有に当たる(ハンドアウトの枠の高さ8のほか、フィナーレの文字・ゲストカード13、アサイン8)。名前で枠を判断できない。
- **layout-polish**(5枠)と **story-flow**(6枠)は、層の中で枠ごとの塊が入り組んでいる。
- **テーマ4本**は5〜7枠すべてに当たる。テーマの層は「テーマ × 全枠」の行列になっていて、枠の部品化とテーマの分離は直交する。phase → legibility → scene-contract の3段の上書き(LAYERS §2)は、どの枠を切り出しても必ず付いてくる。
- **複数の枠を1つのセレクタ群で扱うルールが97個**(うち handout+assign 54。そのほかは assign+ready 8、ready+finale 6、assign+ready+finale 5 など)。部品化では、枠ごとにセレクタ群を分割する作業になる。分割しても宣言が同じでカスケード上の位置が変わらなければ見た目は変わらないが、`audit:css` の同一セレクタ重複検査には注意が要る(AGENTS.md「過去の失敗の再発防止」)。

### 3.2 そのほかの障害

| 障害 | 内容 | 影響 |
|---|---|---|
| 特異度で優先度を取っている | `!important` は0件で、`body#act-showcase-page .cinematic-intro.neotokyo-sequence …` のような接頭辞の長さで勝敗を決めている(LAYERS §1)。パターンBのCSSは、Aの全層より強い特異度を持つか、Aの規則が当たらないクラス名を使う必要がある | パターンBが同じクラス名を使うと、Aの約30層の規則と戦うことになる。**パターンB/Cは、Aと共有しない枠の名前空間(例: `data-scene-pattern="b"` の下)で書く前提にしないと成り立たない** |
| observer の登録順と同期性 | 1〜10の observer は本体より先に登録され、タイトルのロゴ構造は最初の可視フレームまでに同期で確定させている(LAYERS §3.4)。枠の部品を `import()` で遅延読み込みすると、この順序が崩れる | Aの部品は今の読み込み順のまま残す。B/Cを足すときに読み込み方を決める |
| 旧CSS | 旧ベース(`act-showcase.css`)の113ルールは、今の豪華版に対応するDOMがない(`.scene-progress` `.trailer-layout` `.cast-stage` `.handout-file` `.scene-end` など。js/ と HTML に生成箇所なし)。テーマ層にも4ルールある | 枠への振り分けの対象外。うち「確証あり」17クラス(削除済みであることをテストか資料が確認しているもの。第7節)は、別PRで削除した(画面比較の差分0、アクト紹介 E2E で確認)。確証が弱い35クラスのうち neotokyo の旧セレクタ(`__ruler` `__screen--assign` `__assign-title` `__rail` と、それを含む複合2件)・`showcase-neotokyo-title-paused`・`__advance--title-access`・使われていない `@keyframes showcase-cast-entry-reveal` は、js/・全HTML・scripts/・supabase/・config/・assets/・属性セレクタ・他のCSS・テスト・資料まで確かめたうえで、別PRで削除した。続けて `scene-eyebrow` `scene-heading` `scene-heading__note` `scene-heading--cast`(旧ベースの見出し)も、別PRで削除した(`act-showcase*.css` を読み込むページ以外の HTML・JS にも使用なし)。さらに `trailer-*`(ghost・layout・copy・body・visual)・`handout-grid`・`handout-file` 系・`cast-chips`・`cast-stage`・`cast-card__handout-flag`・`data-metrics`・`data-terminal`・`end-content`・`end-seal` の旧ベースの規則58件も、別PRで削除した(いずれも js/・全HTML・他のCSS・テストに使用なし)。テーマ層ほかの旧セレクタ(`poster-v2-grid--3` `poster-v2-roster__title` `neotokyo-sequence__title-logo` `neotokyo-finale__supporting` `-supporting-card` `poster-supporting-card__name` `neotokyo-title-logo__subtitle` `__readout-cursor` `__cursor` `__caret` `__summary-cast-name` `-reading` と、属性 `[data-screen="trailer"]` `[data-act-subtitle]`)も、別PRで削除した(`[data-act-subtitle]` はそれを付けるコードがなく、`#act-subtitle` は編集画面の入力欄で無関係)。`showcase-published-background-restored` も、別PRで削除した(body に付けるコードは、導入した #505 の時点からどの js にもなかった。同じ規則の `.has-showcase-background` 側のセレクタは残し、`showcase-dedicated-background-tiling-audit` の検査はそちらを見るよう直した) |
| 文字列で固定したテスト | `act-showcase-observer-stability` など、ソース文字列を `assert.match` するテストが38本(LAYERS §4.3) | 関数やファイルを動かすと、見た目と関係なく落ちる。意図を保ったまま検査を実装非依存に直す(弱めない)作業が各PRに付く |
| 4・5の繰り返し | 第0節。アサインのパターンは、ハンドアウトのパターンが作ったDOMの上で動く | ハンドアウトとアサインのパターンを別々に選べるようにするには、両者の受け渡し(アサインが使う `__assign-panel` と、ハンドアウト側の縮め方)を契約として決める必要がある |

## 4. テーマ変数を通さない色(枠ごと)

この節と第0節の数(1,210個、枠ごとの表)は、調査時の測定で、`#hex`、`rgb()/rgba()`、`hsl()/hsla()` のうち**引数が変数のもの(`rgba(var(--showcase-primary-rgb), .4)`)は、テーマを通しているので数えなかった**。これに対し、歯止め `audit:showcase-colors` と報告 `scripts/report-showcase-colors.mjs`(どちらも `scripts/hardcoded-colors-lib.mjs` の `countHardcodedColors`)は `audit:colors` と同じ数え方で、`rgb()/rgba()/hsl()/hsla()` を**引数が変数でも1つと数える**(数えないのは、`var(--x, 色)` の代替値・カスタムプロパティの定義値・コメントだけ)。そのため、歯止めの総数(1,804)と、この節の数は比べられない(2026-10-28 に実装を確かめて食い違いを直した)。

**パターン B・C の新しい CSS の色の書き方。** 歯止めの数え方では `rgba(var(--x-rgb), .3)` も直書きと数えるので、新しい CSS には書けない。色は `var(--showcase-*)` と、透明度が要るときは `color-mix(in srgb, var(--showcase-primary) 30%, transparent)` で書く(`rgb()/rgba()/hsl()/hsla()`、`#hex` は、引数が変数でも使わない)。透明度付きの色に使うのは `--showcase-primary` `-secondary` `-tertiary` `-bg` `-surface` など、色そのものを持つ変数で、`-rgb` 版(`rgba()` に渡す用)ではない。`act-showcase*` は `audit:colors` の対象外(パスに `showcase` を含むファイルは除外)で、`audit:showcase-colors` が数えている。

| 枠 | テーマ層以外(core / scenes) | うち黒・白 | 色を持つルール数 | テーマ層の、特定テーマ用セレクタ(`[data-showcase-theme="…"]`)内 |
|---|---|---|---|---|
| 1 ローディング | 30 | 4 | 16 | 0 |
| 2 タイトル | 126 | 28 | 48 | 16 |
| 3 アクトトレーラー | 30 | 3 | 14 | 5 |
| 4 ハンドアウト | 62 | 5 | 29 | 2 |
| 5 キャストアサイン | 192 | 16 | 82 | 12 |
| 6 ACT READY | 143 | 18 | 75 | 16 |
| 7 フィナーレ | 447 | 55 | 225 | 33 |
| 共有の外枠 | 64 | 20 | 31 | 4 |
| `@keyframes` / 全体 / 旧 / スタンダード用 | 3 / 1 / 78 / 0 | | | 0 / 0 / 0 / 12 |

- 複数の枠に当たるルールの色は、それぞれの枠で数えている(重複分48個)。全体の実数は1,210個で、テーマ層以外が1,146個、テーマ層が64個。
- **テーマ層の「全テーマ共通のセレクタ」には直書きが0個。** テーマ層は全部変数で書かれていて、直書きは特定テーマ用の上書き64個だけ。直書きはほぼ全部、テーマが作られる前の層(core / scenes)にある。
- **この中で、今も画面に効いている色の数は未確認。** テーマ層(phase-contract など)が同じ要素の色を変数で上書きしていれば、下の直書きは死んでいる。今4テーマで崩れていないのは主にこの上書きのおかげで、パターンBが要素やクラスを変えると、上書きが外れて下の直書きが出てくる。枠ごとに「計算後の色が直書きから来ているか」を4テーマで測るのが、トークン化の前提になる(cast-view の PR5d と同じ進め方)。
- 黒・白(`#000` / `#fff` / `rgba(0,0,0,…)` / `rgba(255,255,255,…)`)は影や光沢に多い。明るいテーマ(intron)で問題になる。
- JS の直書き: `act-showcase-page.js` 5個(フィナーレのヒーローのポスター装飾 SVG の `stroke`)。`act-showcase-scroll-cue.js` 2個は `?debug=cue` のときだけ出るデバッグ表示。

## 5. スタンダード版とダウンロード出力への影響

| 対象 | 今の構成 | この計画で受ける影響 |
|---|---|---|
| スタンダード版 `act-showcase-standard.html` | 導入演出なしの1枚のページ(`act-showcase-standard.js` が描画)。CSS は standard / standard-hotfix と、豪華版と共有の theme-surface-system / theme-legibility。テーマは同じ `act-showcase-theme-runtime.js` | **7枠の構造とは無関係。** 影響は共有CSSだけ: theme-surface-system にスタンダード用ルール40個、theme-legibility に13個がある。豪華版の枠の規則をこの2ファイルから動かすと、スタンダード版のカスケードも動く。スタンダード版の画面比較は8枚(4テーマ × 2幅)あるが、E2E は名前の引用符の1本だけ(LAYERS §4.2) |
| ダウンロード出力(`js/showcase-dedicated-output.js`) | スタンダード版の構造(`body#act-showcase-standard-page`)に、4つのCSS(standard / standard-hotfix / theme-surface-system / theme-legibility)を `<style>` で埋め込んだ1枚のHTML | 7枠とは無関係。共有CSSの変更はそのまま出力HTMLに入る。CSS のパスは手書きの `?v=3` / `?v=5` を持つ配列(コードで組み立てるURLなので `version:update` の管理外。AGENTS.md の運用どおり)。出力HTMLの描画テストはない(LAYERS §4.2・§4.3)。構成情報(パターン)は出力に載せようがないので、出力は今のまま |
| 公開データ(`showcase_data`) | 生成画面(`showcase-dynamic-publish-v3.js`)がプレビューHTMLから `showcaseData` を組み立て、`theme` を足して `publish_act_showcase_for_current_user` で保存。リポジトリ上の関数定義(`supabase/20_dynamic_act_showcase.sql`)は jsonb をそのまま保存し、検査は「オブジェクトであること・サイズ・キャスト1〜6人」だけ | 構成情報(例: `scenes`)を足すのに、リポジトリ上の定義ではDDLは不要。実DBの関数は、この定義と同じことを2026-10-27に読み取りで確認した(公開・公開の読み出し・本人の復元の3関数、`acts` のRLSは本人の SELECT のみで書き込みは関数経由。公開中の4件に `scenes` はない)。公開のたびに `showcaseData` を作り直すので、`scenes` は生成画面の欄(`#showcase-scenes`)に載せないと再公開で消える。同じ `showcase_data` をスタンダード版も読むので、スタンダード版は新しいキーを無視すればよい。キーがない既存データは全枠Aにする |
| 生成画面 `showcase-generator.html` | テーマは `#showcase-theme` の選択欄。プレビューはスタンダード版の構造 | パターンの選択欄が増える。プレビュー iframe の中身は画面比較の対象外(LAYERS §4.1) |

## 6. 進め方の提案(見た目を変えない小さなPRの列)

各PRは「画面比較の差分0」と `npm run verify`、`Act showcase E2E` で確かめる。1〜5は見た目が変わらないこと自体が完了条件。B/Cパターンの追加(見た目が変わる)は6以降。

| # | PR | 内容 | 確かめ方 |
|---|---|---|---|
| 1 | **済(基準ブランチ #606)** **画面比較: 7枠を決まった状態で撮る**(テストのみ、`visual-regression-baseline` 側。手順は `docs/TESTING_STRATEGY.md` 第8節) | 今の `act-showcase-deluxe.visual.spec.js` の撮影を、枠の名前(1〜7)で引ける形に整理する。各枠の「終わった状態」(NEXT ボタンのラベルが出た時点)で撮る方式は今のまま使う。追加: mobile の intron / vlad / lutetia × 7枠、アクセス画面の mobile、PC2 のハンドアウト・アサイン(1テーマ)、フィナーレのヒーロー部分(今は最終ボードだけ)。既存の基準画像のファイル名は変えない(枠名との対応をspecのコメントに書く) | 3回続けて撮って差分0(LAYERS §4.1 と同じ確認)。既存46枚は不変 |
| 2 | **済** 枠の定義と構成の解釈(純粋関数、Shared core) | `js/act-showcase-scenes.js`: 枠ID `SCENE_FRAMES`(§6.1 の6つ、この順番)、枠ごとに再生できるパターン `SCENE_PATTERNS`(今はどの枠も `a` だけ)、`resolveSceneComposition(data)`(`data.scenes` を読む。データなし・`scenes` なし・オブジェクトでない・枠の指定なし・文字列でない・その枠で再生できないパターン → その枠は `a`。大文字小文字と前後の空白は無視、未知の枠のキーは無視)。`act-showcase-page.js` の `createShowcaseModel` が結果を `model.scenes` に載せるだけで、演出はまだ使わない(読み込まれないモジュールは `audit:js-reachability` で落ちるため、ここまでは読み込む) | 単体テスト `tests/act-showcase-scenes.test.mjs`。画面は不変 |
| 3 | **済** 本体の進行を枠の表で回す(リファクタ) | `js/act-showcase-neotokyo.js` の `INTRO_SCENES`: 行は `loading` / `title` / `trailer` / `handout-assign` / `ready`(`finale` はページ本体なので行を持たない)。各行が見出しの番号 `step`(01〜06)と進捗の値 `progress`(5 / 18 / 30 / 34 / 100。handout-assign は PC ごとに `span` 50 を配分)と、パターンごとの関数 `patterns`(今は `a` だけ。今の `showOpening` などをそのまま使う)を持つ。`runNeoTokyoIntro` はこの表を順に回す。ハンドアウト→アサインの PC ごとの繰り返しは `showHandoutsAndAssigns` に包んだだけ | 画面比較の差分0(CIと同じコンテナで許容差0、104枚)、E2E。順番などを文字列で固定していたテスト5本は、表を読み込んで確かめる形に直した |
| 4 | **済** 枠の印をDOMに付ける | 導入演出の各画面の `section` に `data-scene`(枠ID)と `data-scene-pattern`(`a`)を、`js/act-showcase-neotokyo.js` の `markScene` が要素を作った時点(挿入前)で付ける。ハンドアウトとアサインは同じ `section` なので `handout-assign`。フィナーレは `act-showcase.html` の `#act-showcase-root` に静的に `data-scene="finale" data-scene-pattern="a"`。CSS はまだ使わない。ヒーロー `#scene-opening` に残っていた旧い `data-scene="opening"`(どこからも参照なし)は、同じ属性名で別の意味にならないよう削除した | 画面比較の差分0(許容差0、104枚)、E2E `act-showcase-scene-markers`(各画面が挿入時点で印を持ち、`data-scene*` の属性変化が一度も起きない=既存 observer の `attributeFilter` にも当たらない)とアクト紹介の E2E |
| 5a〜 | **進行中** CSSを枠ごとの塊に寄せる(1枠ずつ別PR) | 1枠だけの層(第3.1節の8ファイル)から始める。やり方: その層のすべてのセレクタの主語に `:where([data-scene="枠"][data-scene-pattern="a"], [data-scene="枠"][data-scene-pattern="a"] *)` を付け、Aの規則をAの枠の中に閉じ込める(§6.1-5)。`:where()` は特異度を足さず、規則の位置も動かさないので、枠の中の要素にとってカスケードは変わらない。対象の層は `tests/act-showcase-scene-css-scope.test.mjs` の一覧に足す。済: handout-assign(assign-cards・assign-cards-theme・neotokyo-linked。neotokyo-linked は §3.1 の表ではハンドアウトとアサインの2枠だが、どちらも同じ section なので1枠として扱う)、finale(poster-v2・cast-selector・ornament・ornament-plus・final-trailer・top-background-only。ただし主語が `body` の2規則 `body.showcase-poster-v2-ready` とその `:after` はページ全体の背景なので閉じ込めない)。複数の枠にまたがるセレクタ群97個は、宣言を変えずに枠ごとに分割する(ファイルをまたぐ移動はしない。元ファイル1つずつ別PR)。複数枠の層はテストの一覧に `frames: [...]` で書き、各セレクタがちょうど1つの枠に閉じていることを確かめる。分割済み: cinematic-fit(title・handout-assign・ready・finale)、visual-trailer-fix(trailer・finale。ただし主語がステージ `.neotokyo-sequence__stage` の規則は、各画面の section の外にあってどの枠にも属さないので閉じ込めない)、title-cyberpunk(title・finale)、presentation-tuning(title・ready・finale)、writing-patterns(title・trailer・handout-assign)、followup-v1(handout-assign・finale)、visual-emphasis(trailer・handout-assign・finale。ただし主語がページ本体 `body`・導入の入れ物 `.cinematic-intro`・`__shell`・`__stage` の規則(ACT TRAILER の文書スクロール)と、導入の共通フッターにある ACT READY の入口ボタンの規則は、どの枠の section にも入らないので閉じ込めない)、handout-live-frame(handout-assign・ready・finale。ただし主語がステージ `__stage.is-handout-scroll` の規則と、スマホ幅でページ本体 `html`・`body`・導入の入れ物 `.cinematic-intro`・`__shell` を整える規則は閉じ込めない)、finale(title・ready。ただし ACT READY 表示中の進行ボタン `__advance` とその `:before` は導入の共通フッターにあるので閉じ込めない。§3.1 の表では共有0だが、実際はこの2つが共有)、neotokyo-hierarchy(title・ready・handout-assign・finale。ただしページ自身の状態表示 `.showcase-loading[hidden]`(`#act-showcase-status`)はどの枠の外にもあるので閉じ込めない。DOM が消えている旧セレクタ `__act-overview*`・`__overview-intro*`・`__trailer-definition` は、後の旧セレクタ削除 PR で消した)、cinematic-readability(title・ready・handout-assign・finale。ただし導入の共通フッター `__footer` とその進行ボタン `__advance`、ACT READY の入口ボタン `neotokyo-finale__access-button` の規則は、どの枠の section の外にもあるので閉じ込めない。`__advance--title-access` はそれを付けるコードも無い)、supporting-cast(title・handout-assign・ready・finale。タイトルロゴ・スタイル札の印・ACT READY のゲスト欄・最終ボードのゲスト欄。すべてどれかの枠の中なので、閉じ込めない規則はない)、neotokyo(loading・title・trailer・handout-assign・ready。導入の基本の層。全画面が共有するクラス `__screen`・`__eyebrow`・`__micro`・`__terminal`・`__section-title`・`__readout` は、作られている枠の数だけ規則を分けた(宣言は同じ)。ただし47規則(重複を除いて31 selector)は閉じ込めない。種類は4つ: 導入の root とページのクラス(6)、header(10)、stage(6)、共通フッターと進行ボタン(9)。テストの一覧に種類ごとに書き、件数を固定した。作る所のなかった旧セレクタは、後の整理で削除した)、act-showcase(基本の層。finale。ただし25規則(重複を除いて18 selector)は閉じ込めない。種類は3つ: ページ全体のリセット `:root` `*` `html` `[hidden]` `button` `a` `body` `*:before` `*:after`、`#act-showcase-root` の外にある静的な ACCESS 導入 `.cinematic-intro*`、読み込み中の行 `.showcase-loading`。`#act-showcase-root` の中の `.opening-*`・ambient stage・ページのフッターは finale。標準版だけが作る `.cast-card*` `.style` の27規則と、使われていない `@keyframes seal` `visual` は、豪華版のページが読み込む js が作らないので、枠に入れず削除した。豪華版のページは `act-showcase-core.css` を読み、標準版のページは読まない)、layout-polish(title・handout-assign・ready・finale。キャストの名前・タイトルの収まり、最終ボードの3列レイアウト、キャストセレクト。ただし22規則(重複を除いて13 selector)は閉じ込めない。種類は3つで、どれもどの画面の section の外にある: ステージ `__stage`(1)、導入の共通フッター `__footer` とその子の進行・段階・状態の文字(4)、ACT READY の入口ボタン `neotokyo-finale__access-button`(`:before`・`:after`・中の文字を含む)とそのマーカー `__access-marker`(8)。テストの一覧に種類ごとに書き、件数を固定した)、story-flow(title・trailer・handout-assign・ready・finale。ハンドアウトの参加情報・アサインの経緯・ACT TRAILER の導入・ACT READY の参加経緯の一覧・最終ボードの性別/ID 欄。すべてどれかの枠の中なので、閉じ込めない規則はない)、cinematic(loading・title・trailer・handout-assign・ready。ACT FILE ACCESS のシール・タイトルのロゴ・ACT TRAILER の端末風の枠・名前の収まり。ただし導入の入れ物 `__shell`(`:before`・`:after` を含む)とステージの `:before`、全画面共通の基本規則 `.neotokyo-sequence__screen` は、どの枠の section の外、または全部の枠が共有するので閉じ込めない)、cinematic-v2(title・trailer・handout-assign・finale。タイトルロゴの複数行表示・ACT TRAILER の読み上げ・スタイル札・ページ冒頭のヒーロー・最終ボード。ただし主語がステージ `__stage.is-trailer-scroll` の規則は、各画面の section の外にあるので閉じ込めない)。枠の振り分けは要素の名前の単語ではなく、`js/` で要素を作る場所と `act-showcase.html` の `#act-showcase-root` の中かどうかで決める(名前に `assign` を含む `.poster-v2-tags` は最終ボード、`neotokyo-story__title-note` はタイトル画面の中。名前だけで決めた2か所が画面比較で赤になった)。ヘルパー関数は、画面のクラスを調べる `if` や `querySelectorAll(".…screen--X").forEach(関数)` から、直接または関数を何段かたどって呼ばれていれば、その画面の枠とみなす(`enhanceScreen` → `enhanceAccess`・`enhanceTrailer`、`decorateLinked` → `ensureHandoutContext`)。descendant セレクタは祖先の中にだけ当たるので、subject が複数の枠で共有される状態クラス(`.is-role-primary`)のときは、祖先の枠を採る(`.summary-cast-styles span.is-role-primary` は ACT READY)。複数の画面で作られる共有クラスは、作られている枠の数だけ規則を分ける。`js/` にも HTML にも作る所がないクラスは、枠を推測せず旧セレクタとして閉じ込めずに残す。根拠が名前の単語だけのものは、一覧にして1つずつ確かめる | 画面比較の差分0(許容差0、104枚)、アクト紹介の E2E、`audit:css` |
| 5b〜 | 直書きの色を枠ごとにテーマ変数へ(1枠ずつ) | 方針(2026-10-27): 全部は置き換えない。(a) 直書き色の歯止め `audit:showcase-colors`(基準値は今の数。増えたら落ちる。基準値にない新しい CSS=パターン B・C は直書き0)と、枠ごとの測定 `scripts/report-showcase-colors.mjs` を先に入れる。(b) 試し置き換えは loading と trailer の「区分A」(4テーマのどれでもテーマ層が上書きしていて効いていない直書き)だけ。計算後の色を4テーマで測り、値は今と同じ。(c) title・ready・handout-assign・finale の変数化とテーマ層の閉じ込めは保留。パターン B・C を作る中で必要になったものだけ戻って対応する。区分B(効いていて値がずれるもの)は統一せず固定のまま。白い光沢は原則固定。標準版(`act-showcase-standard*`)には手を付けない。
  試し置き換えの結果(loading・trailer): 色を持つ宣言を1つずつ外して、枠の要素(`::before`/`::after` を含む)の計算後の色が4テーマ × 2幅 × 3状態(読み込み中・ACCESS・トレーラー)で変わるかを調べた(トランジションは切って測る。切らないと、遷移の途中の値を拾って「効いていない」と誤判定する。実際に ACCESS シールの影で起きた)。変わらない宣言だけから成る23規則・40色を、色の家族(青緑=primary、ピンク=secondary、緑=tertiary、暗い紺=bg、明るい文字=readable-text、灰青=readable-muted)でテーマ変数に置き換えた。黒・白は固定のまま。置き換えの前後で、計算後の色は24通りすべて一致、画面比較は差分0。直書きは1,821→1,804。残りは区分B(効いている。bootlog の線と末尾の文字、トレーラーのターミナルの走査線と読み上げ中の文字の4宣言)と、状態が測定に出てこなかった7宣言で、固定のまま。1つずつ外す方法は、同じ値の宣言が2つあると両方「効いていない」と出るので、置き換えは規則単位でまとめて行い、置き換え後の計算後の色をもう一度測る | 画面比較の差分0、`act-showcase-contrast`、`audit:showcase-colors` |
| 6 | 構成情報の保存と読み出し | 生成画面の選択欄、`showcase_data.scenes`、豪華版での解釈(2の関数)。Aしかない状態で入れ、全枠Aで今と同じに再生されることを確かめる。実DBの関数定義の確認を含む(DDLが要る場合は別ゲート) | 既存データ(キーなし)とA指定のデータの両方で画面比較の差分0 |
  方針と分け方(2026-10-27): DBの変更なし(`showcase_data` は検査のない jsonb で、公開の関数は `casts` 1〜6件・512KB 以下・オブジェクトの3つしか見ない。実DBの関数定義、`acts` のRLS、4件の公開アクトを確認済みで、`scenes` を持つものは0件)。公開の関数に `scenes` の形の検査は足さない(読み手が枠ごとに a へ戻す)。3本に分ける: (1) 書く側と復元する側の共通処理 **済**: `js/act-showcase-scenes.js` の `normalizeSceneSelection`(A以外の枠だけ、枠の順、名前は小文字・トリム。今は再生できない名前も書いたまま残す)、`formatSceneSelectionField` / `parseSceneSelectionField`(生成画面の hidden 欄 `#showcase-scenes` に JSON。空は全枠A)。公開(`showcase-dynamic-publish-v3.js`、豪華版・従来版の両方)は欄を読み、A以外の枠があるときだけ `showcaseData.scenes` を付ける。復元(`showcase-edit-restore.js`)は保存済みの `scenes` を欄に書く(無いときも空で書く。前に復元したアクトの構成が残らないように)。公開のたびに `showcaseData` を作り直すので、欄に載せないと再公開で消える。それを往復テストで固定した。(2) 生成画面の選択欄 **済**: `js/showcase-scene-selector.js`(`SCENE_PATTERNS` から組み立てる。再生できるパターンが2つ以上ある枠だけに `<select>` を出し、今は全枠Aだけなので `#showcase-scene-composition` の fieldset ごと隠れたまま)。選んだ値は hidden 欄 `#showcase-scenes` にだけ書き、公開・復元は欄だけを読み書きする。選んだ枠の項目だけを変え、ほかの項目(今は再生できない名前を含む)は残す。Aを選ぶと項目を消す。復元で欄が書かれる(`input` が発火する)と選択欄も追従する。置き場所と見た目は、パターンB・Cが入る枠が決まってから詰める(今はCSSなし)。テストはBを持つ枠を渡して、保存・復元・再公開で保たれることを確かめる(本番の `SCENE_PATTERNS` はAのまま)。(3) 全枠Aでの確認(キーなしとA指定の両方で画面比較の差分0)。従来版の再公開でも `scenes` は消さずに引き継ぐ |
| 7〜 | パターンB/Cの追加(見た目が変わる) | 枠ごとに1PR。`data-scene-pattern="b"` の下でだけ効くCSSと、その枠の関数を表に足す。基準画像はB用を新規に追加し、A用は変えない。B・C の新しい CSS は、色を `var(--showcase-*)` と `color-mix()` だけで書く(第4節) | 新しい基準画像、E2E |

  7 の分け方(2026-10-28 決定。最初のパターンは trailer の B「縦組み」): 4本に分ける。(1) 資料の訂正(直書き色の数え方)。(2) 打鍵に合わせた追従スクロールの共通部品: `js/act-showcase-caret.js`(`lastCharRect` = 読み上げ済みの最後の文字の位置、`scrollDeltaToKeepVisible` = 純関数、`keepCaretVisible`)と、`typeSplitReadout` の省略可能な引数 `onStep`(打鍵1回ごとと、読み上げ終了時に呼ぶ)。A は渡さない(A の枠は `cinematic-layout-v2` が自分で追う)。書字方向はスクロール枠ではなく本文の要素から取る。(3) 画面比較の基準画像の PR(B 用の spec。`SCENE_PATTERNS.trailer` に `"b"` が無いときは `test.skip`)。(4) B の実装(B 用の CSS=直書き0、`SCENE_PATTERNS.trailer` を `["a","b"]` に、JS、`playWithFallback`、E2E、単体テスト)。4 は本番で生成画面の選択欄が初めて表示される変更なので、検証側にマージしたら本番へ同期する前に、実画面の確認を待つ。

  7 の1つ目: trailer の B「縦組み」(2026-10-28 決定、実装は4本目の PR)。
  - **見た目。** PC 幅は、見出しを上に横組み1行で置き(右端に小さい index と meta、見出しの横に eyebrow)、その下に本文を枠の全幅・下端近くまで縦組み(`writing-mode: vertical-rl`、右から左)で置く(2026-10-28 に、左に縦組みで置いていた見出しと eyebrow の重なりを直し、本文の縦を約3文字ぶん広げた。枠は `position: absolute` で舞台の余白に食い込ませる。箱は `direction: rtl` で右端から始まり、あふれると左へ伸びる。本文は `direction: ltr`)。幅 760px 以下、または高さ 520px 以下は、見出しを上、本文を下の横組みに切り替える(高さ 520px 以下は、さらに eyebrow・index・meta を隠して見出しを小さくする。縦向きの phone でも、横向きの phone でも、画面に収まる)。
  - **縦組みに向かない文字。** 英数字・英語・URL は `text-orientation: mixed`(横倒しで読める。`upright` は英単語が1文字ずつ縦に並んで読めないので不採用)。数字の縦中横は、本文が打鍵用のプレーンな文字で markup が付けられないので使わない。長音・「…」・「―」は、フォントの縦書きグリフでそのまま出る。禁則と折り返しは `line-break: strict`・`overflow-wrap: anywhere`。見出しは横組みのまま。
  - **打鍵の追従。** 本文は専用の箱の中でスクロールし、`typeSplitReadout` の `onStep` から `keepCaretVisible` を呼んで、読み上げ中の最後の文字を箱の中に保つ。書字方向は本文の要素から取る(縦組みは横にスクロール、横組みは縦にスクロール)。A の枠の高さ追従(`cinematic-layout-v2`)には触れない。
  - **A の装飾を受けない。** B は専用のクラス名(`neotokyo-trailer-b__*`)だけを使い、A の層が探すクラス(`.neotokyo-sequence__screen--trailer`、`__readout`、`__trailer-terminal` など)を使わない。端末窓・outro・ページのスクロール・`data-trailer-pattern` は B に付かない(実測: `tests/e2e/act-showcase-scene-b.spec.js`)。テーマ層の trailer 規則はパターンの指定が付いていないので、同じクラス名を使うと B にも当たるため、これも別のクラス名にする理由。
  - **7つ目の CSS。** `css-next/pages/act-showcase-patterns.css`(出典名 `act-showcase-pattern-trailer-b.css`、`act-showcase.html` の6つの後に読む。パターン B・C の CSS はここに出典ごとに足す)。ルールは全て `:where([data-scene="trailer"][data-scene-pattern="b"], … *)` で閉じ、色は `var(--showcase-*)` と `color-mix()` だけ(直書き0、`rgb()` も使わない。第4節)。`tests/act-showcase-pattern-b-css.test.mjs` が、スコープ・クラス名・色・keyframes の名前を検査する。`prefers-reduced-motion`(遷移とキャレットの点滅を止める)、`prefers-contrast: more`(本文の背景を不透明に、枠線を太く)、`forced-colors: active`(装飾の「03」を隠す)に対応。
  - **失敗時は A。** `playWithFallback`(`js/act-showcase-scenes.js`、DOM を使わない関数)が、枠の再生に使うパターンを選び、B が例外を投げたら A で再生する(A が失敗したときは隠さない)。B の画面は、進捗の更新や DOM に触る前に作るので、失敗しても画面は元のまま。
  - **確認(2026-10-28)。** 文字コントラストは4テーマ(PC 幅)で失敗0。長文(約200字)を 1440x1000・390x844・360x640・844x390 で打ち、打鍵中のキャレットが枠から出た回数は0、読み終えた末尾も枠内。**共有ヘッダ「MUNICIPAL DATABASE」は 390 幅の intron で 2.73:1(A でも出る既存の問題。B では直さない。既存のコントラスト E2E は 1440 幅しか測っていない)**。
  - **本番の影響。** `SCENE_PATTERNS.trailer` が `["a","b"]` になるので、生成画面の構成の選択欄(#646)が本番で初めて表示される(trailer の1つだけ)。既存の公開アクトは `scenes` が無く、A のまま。
  7 の2つ目: title の B「タイトルカード」(2026-10-29 決定、案1の入りの動きに、案3の「確定の瞬間の色ズレ」だけを足す)。
  - **見た目。** アクト名を画面中央に極大の1行(折り返しあり)で置く。入りは、画面の点灯(ちらつき)→ 光の縁が左から右へ走ってアクト名が現れる(`clip-path` のワイプ、約0.9秒)→ 現れた瞬間に、色ズレ(`--showcase-primary` と `--showcase-secondary` の `text-shadow` が左右に割れて収まる、約0.5秒)。そのあと、罫線(中央から左右へ伸びる)、副題、クレジット(RULER と、あれば SCENARIO WRITER)、状態行が点灯風に順に出る。フェードアウトは使わない。NEXT を待つのは A と同じ。
  - **A との違い。** B は `neotokyo-title-b__*` の専用のクラス名で、A の後付け層(メタ帯・ゴースト文字・罫線・副題・脚本家クレジット・`showcase-neotokyo-title-logo-active`)は付かない。そのため、A では DOM の後読みで足している副題と脚本家は、B ではモデルから描く(`act-showcase-page.js` のモデルに `scenarioWriterName` を足した。副題は `heroSubTitle` で、`CAST SHOWCASE` のときは出さない A と同じ規則 `meaningfulSubtitle`)。
  - **CSS。** `css-next/pages/act-showcase-patterns.css` の2つ目の出典 `act-showcase-pattern-title-b.css`。全ルールを `:where([data-scene="title"][data-scene-pattern="b"], … *)` で閉じ、色は `var(--showcase-*)` と `color-mix()` だけ(直書き0)。幅 760px 以下、または高さ 520px 以下は、クレジットを縦積みにする(高さ 520px 以下は状態行も隠す)。reduced-motion は動かさず最終状態、prefers-contrast は光の縁の発光を消して罫線を太くする、forced-colors は光の縁を隠す。
  - **本番の影響。** `SCENE_PATTERNS.title` が `["a","b"]` になるので、生成画面の構成の選択欄に title の欄が増える。既存の公開アクトは `scenes` が無く、A のまま。

  7 の3つ目: ready(ACT READY)の B「ポートレート中央」(2026-11-02 決定。3案を A と並べて比べ、案3を選んだ)。
  - **見た目。** 中央に ACT READY(字間を広げた極大の1行)、その下にアクト名と RULER、その下にキャストを丸い画像で横に並べる(画像の下に `PCn`、役割、名前、スタイル)。キャストの下に小さな行として、GUEST(ゲスト)と SCENARIO WRITER(脚本家)を添える。入りは、画面の点灯 → キャストが左から順にちらつきながら入る → 行が入る(フェードアウトはしない)。文字の下には、`--showcase-surface` と `--showcase-bg` を混ぜた不透明なパネルを敷く(intron など明るいテーマでコントラストが足りなくなるため)。
  - **丸い切り抜きの位置(2026-11-04)。** キャスト画像は全身・バストアップで顔が上寄りのものが多く、中央基準だと縦長の画像の顔が上で切れた。`object-position: 50% 6%`(上寄り)に固定した。act-0021 の縦長2枚(560x840)で 0〜25% を比べ、4〜8% なら頭全体が円に入り、10% 以上は髪や輪が縁に触れる。正方形・横長の画像は縦に余白が無く、位置は効かない。画像ごとの個別調整の機能は入れない(ほかに画像を丸く切り抜く場所は無い)。
  - **丸い画像の拡大(2026-11-04)。** 顔を円の中心のやや上に寄せるため、画像を1.25倍に拡大する(`transform: scale(1.25)`、基点は画像の上から6%。固定の1値)。1.0・1.25・1.5倍を act-0021 の実画像(縦長・正方形)と横長で比べ、1.5倍は縦長の頭の輪や、正方形・横長の髪や額が切れるので採らない。1.25倍は、縦長の顔が円の上から4割弱になり、頭と輪はほぼ収まる(正方形と横長は髪の頭頂が縁に触れる)。
  - **役割ラベル。** `roleForCast`(参加ロール、なければハンドアウトの役のスタイル)が空なら、行ごと出さない(`UNREGISTERED`・空欄・`NO HANDLE` は出さない)。
  - **A の装飾を受けない。** B は `neotokyo-ready-b__*` の専用のクラス名で、A の後付け層(`--summary`・finale のロックアップとコア・FINAL BRIEFING への書き換え・ゲスト欄・脚本家クレジット・アクセスボタン・`showcase-neotokyo-finale-active`)は付かない。ゲストは model の `guests`(表示名の配列)から B が描く。`act-showcase-page.js` が、`scenes.ready` が `b` のときだけ `loadPublicShowcaseGuests`(キャッシュ付き)を最大2秒待って詰める(失敗・遅延ならゲストの行だけが無い。A の `supporting-cast` は同じ取得を共有する)。脚本家は `scenarioWriterName`(title B で足したもの)から描く。
  - **進む操作。** 画面下の標準フッターの「OPEN FULL SHOWCASE」ボタンで進む(A の「ENTER」アクセスボタンは作られない)。`summary-advance-guard` は `--summary` の有無で判定するので B には効かない。代わりに、B の `section` が `data-advance-guard="button"` を持ち、ステージのクリックハンドラ(`act-showcase-neotokyo.js`)が、ステージ内にそれがあるときは「空きをクリックして NEXT」を無効にする(余白のクリックも含む)。誤クリックでは進まない(E2E)。
  - **キャスト画像。** `createCastImage` と `FALLBACK_IMAGE` を export した(別の PR、動作は変えない)。B の module から `act-showcase-neotokyo.js` を import すると循環になるので、`createReadyScreenB` が引数 `createImage` で受け取る。
  - **phone 幅と最大6人。** 760px 以下は2列(奇数の最後は中央)。スタイルの行は phone では出さず(3人が 390x844 で画面に収まるように)、PC 幅では2行で切って出す。名前は `overflow-wrap:anywhere`・`text-wrap:balance` で折り返し、3行で切る(`line-clamp:3`)。画面は縦に `overflow-y:auto`(足りないときは画面の中でスクロールし、フッターは動かない)。最長の名前6人で、390・360・844 幅と PC 幅に、横あふれと、セルからのはみ出しが無いことを E2E で確かめる。
  - **CSS。** `css-next/pages/act-showcase-patterns.css` の3つ目の出典 `act-showcase-pattern-ready-b.css`。全ルールを `:where([data-scene="ready"][data-scene-pattern="b"], … *)` で閉じ、色は `var(--showcase-*)` と `color-mix()` だけ(直書き0)。reduced-motion・prefers-contrast・forced-colors に対応。
  - **失敗時は A。** `playWithFallback`。B の画面は、進捗の更新や DOM に触る前に作る。
  - **本番の影響。** `SCENE_PATTERNS.ready` が `["a","b"]` になるので、生成画面の構成の選択欄に ready の欄が増える。既存の公開アクトは `scenes` が無く、A のまま。

  7 の4つ目: handout-assign(ハンドアウトとキャストアサイン)の B「ポートレート先行」(2026-11-05 決定。調査の結果の3案を A と並べて比べ、案2を選んだ)。
  - **範囲。** 枠まるごと(ハンドアウトの読み上げと割り当て)を B 専用のクラス名で作る。割り当てのカードだけを B にする案は採らない: A の `section`(`--linked`)にハンドアウト側の観察層(`writing-patterns`・`story-flow`・`handout-live-frame`・`scroll-cue`)が付いたままになり、決定 #5 に反し、`data-scene-pattern` も a と b のどちらにしても半分が合わない(「組で1つ」の決定 #3 とも合わない)。PC の数だけ繰り返すのは B の関数(`showHandoutAssignsB`)の中。
  - **見た目。** 左に空の丸い枠(点線)、右にハンドアウト(主題、ROLE/CONNECTION/SUIT などの項目、本文)。割り当てで丸に顔が出る(拡大1.25倍・基点上から6%の固定の1値)。**名前は左の細い列から外し、両方の列の下に全幅で置く**(長いハンドルと名前が狭い列で何行にも折れたため。ハンドルと名前は1行ずつ、各2行まで)。その下にスタイルカード。phone 幅(760px 以下)は縦に積む(丸 → 主題 → 項目 → 本文 → 名前 → カード)。
  - **出し方(穏やか)。** 入りは画面の短いフェードイン。割り当てでは、検索中は丸の外周が回り、見つかると枠が光り、顔・名前・カードは短いフェードインで出て、そのあとカードが左から順にめくれる(`?flip=fast|normal|slow` の既存の指定がそのまま効く)。消える側のフェードは付けない。reduced-motion は、カードが最初から表向きで、動きは付けない。
  - **状態。** 画面の状態は2つの属性だけ: `data-phase`(`reading` → `read` → `searching` → `found` → `assigned`)と `data-flip`(`idle` → `running` → `done`)。E2E と画面比較は、固定の待ちではなく、この属性を待つ。待ちはすべて `wait()` を通すので、SKIP で一度に終わる(A のカードの「CAST ASSIGNED」の札のように `window.setTimeout` で外から動かすものは無い)。各状態の長さは `B_SEARCH_MS`(1000)・`B_FOUND_MS`(600)・`B_FACE_REVEAL_MS`(700)。
  - **役割。** `roleForCast`(参加ロール、なければハンドアウトの役のスタイル)を直接使う。空なら ROLE の項目も役割の行も強調するカードも出さない(`UNREGISTERED` は出さない)。A は `getParticipationRole` で作ったあと、`supporting-cast` が後から直し、ハンドアウト側の ROLE セルは直らず `UNREGISTERED` と出る。B は出どころが1つ。
  - **ハンドアウトの項目。** 本文の「推奨スタイル：… コネ：… 推奨スート：…」を、純粋な `js/act-showcase-handout-fields.js`(`handoutFacts`、`splitHandoutTitle`、`splitCastName`)で読む。A は同じ読み取りを `writing-patterns.js` の即時実行関数の中でやっていて取り込めないので、項目名の表 `FIELD_DEFS` を同じにし、同じであることをテストで確かめる。項目は コネ → スート → 関係 … の順に最大3つ。スタイルは主題(見出し)なので項目に含めない。
  - **長い本文。** 本文は枠の中の箱でスクロールし、追従スクロールの共通部品 `act-showcase-caret.js`(`prepareSplitReadout` と `keepCaretVisible`、向きは y)で、打鍵の先を見せる。A の `handout-live-frame`(ResizeObserver で枠を伸ばす)は B では使わない。
  - **A の装飾を受けない。** `neotokyo-assign-b__*` の専用のクラス名。A の観察層はどれも A のクラス名(`--linked`、`__handout-panel`、`__assign-panel`、`__cast--linked`、`.neotokyo-style-card` など)を探すので、B には効かない。
  - **キャスト画像。** `createAssignScreenB` が引数 `createImage` で受け取る(`act-showcase-neotokyo.js` を import すると循環になるため)。画像は画面を作るときに作って隠しておくので、読んでいる間に読み込まれ、割り当ての瞬間に待たない。
  - **phone 幅。** 画面は縦に `overflow-y:auto`。割り当てで名前とカードが画面の下にはみ出すときは、画面を下までスクロールする(穏やかに。reduced-motion は即時)。
  - **CSS。** `css-next/pages/act-showcase-patterns.css` の4つ目の出典 `act-showcase-pattern-assign-b.css`。全ルールを `:where([data-scene="handout-assign"][data-scene-pattern="b"], … *)` で閉じ、色は `var(--showcase-*)` と `color-mix()` だけ(直書き0)。reduced-motion・prefers-contrast・forced-colors に対応。
  - **失敗時は A。** `playWithFallback`。B の画面は、進捗の更新や DOM に触る前に作る。
  - **本番の影響。** `SCENE_PATTERNS["handout-assign"]` が `["a","b"]` になるので、生成画面の構成の選択欄に handout-assign の欄が増える(選択欄は4つ)。既存の公開アクトは `scenes` が無く、A のまま。

  共通の直し(2026-11-02、実画面の確認で見つかった2点。A・B どちらにも効く):
  - **短い画面でフッターが見切れる。** `.neotokyo-sequence__shell` が `min-height:560px` で、高さ 560px 未満の画面(小さいウィンドウ、横向きの phone)では、シェルが画面より高くなり、フッターと NEXT ボタンが画面の外に出ていた。`min-height` を外して、高さは常に画面の高さ(`100svh`)にし、高さ 559px 以下ではあふれた中身をステージの中でスクロールする(`align-items: safe center; overflow-y: auto`)。横向き phone(844x390)の NEXT ボタンもこれで画面に入る。
  - **タイトルと読み上げが途中から見える。** Google Fonts を `display=block` で読むので、画面を入れた時点で必要な字形(Noto Sans JP は unicode-range で細かく分かれている)の取得が始まり、届くまで文字が見えない。その間もアニメーションと打鍵は進むので、届いた時点で途中から見えていた。`swapScreen(state, content, { waitForFonts: true })` は、画面を隠したまま入れ、レイアウトでフォントを要求させ、2フレーム待ってから `document.fonts.ready` を待つ(上限 2.5 秒、スキップで即解除)。待つ間、A の画面のアニメーションは一時停止し(A のアニメーションは `.is-visible` ではなく要素の挿入で始まるため)、表示と同時に最初から再生する。title・trailer(A・B)・handout-assign・ready で使う。loading の画面は待たない(その間にフォントが読み込まれる)。
  - **上下の黒い帯がフッターの下辺を覆う(2026-11-02 の続き)。** シェルの `::before` / `::after`(黒い帯、高さ `clamp(12px, 2.2vh, 26px)`)が、フッターの下の余白(`padding-bottom`、22px・phone 縦は 16px)より高くなると、帯がフッターの最後のピクセル(NEXT ボタンの下辺の枠)を覆う。PC は高さ 1000px 超(1040 で約1px、1080 で約2px、1200 で約4px)、phone 縦は高さ 727px 超(844 で約3px、932 で約4px)。シェルの余白を `--neotokyo-pad-top` / `--neotokyo-pad-bottom` にして、帯の高さを `min(clamp(12px,2.2vh,26px), 余白)` で頭打ちにした(余白が帯より低いときは帯はそのまま。1440x1000 は 22.0px で余白と同じなので変わらない)。E2E は `act-showcase-screen-timing.spec.js` の「上下の黒い帯は、その下の余白より高くならない」。

- #2 の補足: 計画では「まだどこからも使わない」だったが、どこからも読み込まれないモジュールは `audit:js-reachability` で落ちる(例外リストは実行時に動的に読み込まれる実在の入口に限る)。そのため `createShowcaseModel` から読み込んで `model.scenes` に載せることにした。演出はまだ使わず、画面は変わらない(2026-10-22 了承)。

### 6.1 決定事項(2026-10-22)

上の表と第0〜5節は決定前の調査として残す。以後の作業はこの決定に従う。

1. **名前。** 既存のクラス名・ファイル名は変えない。既存の `finale`(`act-showcase-finale-enhancer.js`、`.neotokyo-sequence__screen--finale`、`.neotokyo-finale__*`、`body.showcase-neotokyo-finale-active`)は **ACT READY** を指す。新しく作る枠IDは `ready`(ACT READY)と `finale`(ページ本体: ヒーロー `#scene-opening` と最終ボード)とする。新しい `finale` と既存の `.neotokyo-finale__*` は別物である。
2. **テーマ・背景はアクトに1つ。** 枠ごとには変えない。テーマ変数を `:root` から移す作業は不要。
3. **ハンドアウトとキャストアサインは組で1つのパターンとして選ぶ。** 選ぶ枠は6つで、順番は固定: `loading` / `title` / `trailer` / `handout-assign` / `ready` / `finale`。上の表の #2 の枠IDもこの6つに読み替える。
4. **ローディングの前半は全パターン共通。** データ取得前の静的な読み込み画面(`.cinematic-intro__*`)はパターンを持たない。`loading` の枠で選べるのは、データ取得後の ACCESS 画面(`.neotokyo-sequence__screen--opening`)から。
5. **パターンB/CはAの後付け層の装飾を受けない。** B/C は専用のクラス名と、`data-scene-pattern="b"` などの下でだけ効くCSSで作る。Aの層(observer と、既存クラス名に当たるCSS)はAの中に閉じ込める。

画面比較の名前(#1)も、この6つの枠IDに合わせる。

## 6.2 LOADING と先読み(2026-11-04 決定、実装は順に別PR)

遅い回線で「全体が重い、演出が途中から始まる、黒い画面のまま」になる問題への対処。まず測定し、決めた順に直す。

**測定(2026-11-04、ローカルの Chromium、本物の act-0021、1440x900、Slow 4G=1.6 Mbps・往復150ms+CPU 4倍遅く)。** 制限なしでは、最初の描画が約1.0秒、データ取得の開始が0.7秒。Slow 4G+CPU 4倍では次のとおり。

| 事象 | 時点 | 原因 |
|---|---|---|
| 最初の描画まで完全な黒 | 約4.8秒 | 描画をブロックする CSS 7本(544KB)と Google Fonts の CSS(205KB、`display=block`)が届くまで |
| データ取得(RPC)の開始 | 7.6秒 | bootstrap が16個のモジュールを1つずつ `await import()` し、取得を担う `act-showcase-page.js` は11番目 |
| LOADING 画面に切り替わった直後 | 約0.7秒、文字が空 | この画面にはフォント待ちが無く、文字が `display=block` で見えない |
| title・trailer | 挿入から2.1秒・2.45秒後に表示 | フォント待ち(#660、上限2.5秒)。この間にフォントは 33/865 しか届かない |
| キャスト画像 | 2人目以降は、各ハンドアウト画面の作成時に初めて取得 | 画像は画面を作る時まで取得しない |
| ゲスト画像2枚 | 原寸 PNG(883KB・984KB)、21秒台まで | データ取得の直後から、フォント872KB(42ファイル)と帯域を取り合う |

ページ全体は約4MB。コード上の止まる経路は2つ(再現はしていない): bootstrap の `import` が1つでも失敗すると、以降(page.js を含む)が動かず静的な LOADING のまま止まる。RPC に `fetch` のタイムアウトが無く、応答が来ないと止まる。

**直す順番(それぞれ別PR。(1)(6)は見た目を変えないので、画面比較の差分0を確かめる)。**
1. **起動の高速化(済、このPR)。** データ取得(RPC 2本)を、`act-showcase.html` の head のインラインスクリプトで、スタイルシートより前に始める(スクリプトは自分より前のスタイルシートだけを待つ。モジュールのスクリプトは全部を待つ)。`js/act-showcase-bootstrap.js` が同じことをする保険を持つ。取得は `public-showcase-service.js` がキャッシュするので、ページと supporting-cast は同じ promise を受け取る(そのため、サービスは同じ URL で import する)。bootstrap の16個の `await import()` は、`// modulepreload: eager` の目印で `generate-modulepreload.mjs` が preload の対象にし、並列に取得する(**実行の順番は今のまま**。観察層の登録順に依存しているため)。head の preload の位置を CSS の前に移した。あわせて、B のパターンのモジュール(title-b・trailer-b・ready-b・caret など)と ready B が使う2つの import に `?v=` を付けた(付いていないと、変えた時にブラウザのキャッシュから古い版が出る)。測定(Slow 4G+CPU 4倍): データ取得の開始 7.6秒 → 0.47秒、LOADING の開始 8.8秒 → 5.5秒、title の表示 13.9秒 → 10.6秒。残りは CSS 待ち(5.4秒)で、(2)で扱う。
2. **黒い画面の監視と、失敗時の復帰(6)(済)。** 見た目は、失敗した時と遅い時の表示が増えるだけ(通常は変わらない)。
   - bootstrap の16個の `await import()` を `try/catch` で囲み、1つでも読み込めなければ、`js/act-showcase-load-error.js` の `showLoadError` が、LOADING の画面を外して「ページの読み込みに失敗しました。通信状態を確認して、再読み込みしてください。」と再読み込みのリンクを出す(以前は、静的な LOADING のまま止まった)。
   - データ取得(`public-showcase-service.js` の `callPublicRpc`)に15秒のタイムアウトを付けた。超えたら中止し、「公開データの取得に時間がかかりすぎました。…」を同じ形で出す。失敗した取得はキャッシュから忘れるので、取り直せる。
   - `act-showcase.html` の head のインラインスクリプトに、6秒の監視を足した。演出が始まらないまま6秒たつと、LOADING の画面に「読み込みに時間がかかっています。再読み込み」を出す(演出が始まれば、LOADING の画面ごと消える)。文字の色は LOADING の画面のもの(`inherit`)で、色の指定は足していない。
   - 失敗の表示は、メッセージと再読み込みのリンクを1つのまとまりに入れる(状態表示は `display: grid` で、別々の子にすると行が大きく離れた)。
3. **最初の黒を短くする(2)。** Google Fonts の CSS を、描画をブロックしない形にする。LOADING の文字に使う最小限のフォント(英数字)だけを先に読む。
4. **先読み・進捗・時間切れ(3〜5)。** LOADING で先に読む素材は、`showcase_data` と `scenes` から決める(必須: データ、使う文字だけのフォント。先読み: キャスト画像(最大6枚)、ゲスト画像、背景)。進捗は、LOADING の `bootlog` に素材ごとの行(`DATA`・`FONT`・`CAST IMAGES 2/3`・`GUEST 0/2`)を出す(件数ベース)。時間切れの上限は、画像6秒(代替表示の `scan-failed.webp` で先に進み、届いたら差し替える)、全体8秒(超えたら素材が揃っていなくても始める)、データ15秒。フォント待ち2.5秒(#660)は安全網として残す。「前半は共通の LOADING」は変えない。
5. **ゲストの原寸 PNG のサムネイル化(別の変更)。** Supabase の画像変換(Pro機能)には頼らず、アップロード時に小さい版も作る方式を、後で提案する。

実機での確認(ローカルの制限による再現との違いを見る)は、(1)(6)の後にユーザーに依頼する。

## 7. 調べ方(再現用)

- 枠への振り分け: 豪華版の6つのCSSバンドルを1ルールずつ読み、`/* ==== from: … ==== */` の境界コメントで元ファイルを決めた。各セレクタは、含むクラス名で枠に振り分けた: 1 = `cinematic-intro__` `screen--opening` `bootlog` `access-seal` など、2 = `screen--title` `act-title` `title-logo` `ruler-credit` など、3 = `screen--trailer` `readout--split` `trailer-*` など、4 = `handout` `link-bridge` `context-` など、5 = `assign` `search` `cast--linked` `style-card` `is-splitting` など、6 = `screen--summary` `summary` `overview` `neotokyo-finale` など、7 = `poster-` `scene-opening` `.opening-` `ambient-stage` など。`screen--linked` `linked-head` だけのものは4と5の両方、どれにも当たらず `neotokyo-sequence` を含むものは共有、`#act-showcase-standard-page` はスタンダード用とした。
- 「旧」= 生成箇所が `js/` と `act-showcase*.html` にないクラス(`.scene-progress` `.trailer-layout` `.cast-stage` `.scene-heading` `.data-metrics` `.trailer-visual` `.cast-chips` `.handout-file` `.scene-end` など)。
- 旧セレクタの数え方: `act-showcase*.css` のクラス名を、複合セレクタの途中のもの(`body.x`・`h3.y`・`.a.b` の2つ目以降)も含めて取り出し、`js/`(全サブディレクトリ)と全HTMLに名前が出てこないものを数える(2026-10-26 時点で52クラス)。クラス名を取り出す正規表現で `.` の直前の文字を「単語の文字でない」ものに限ると、複合セレクタの途中のクラスを見落とすので避ける。「確証あり」(17)= 削除済み・生成されないことをテスト(`act-showcase-canonical`・`showcase-cinematic-layout-v2`・`act-showcase-neotokyo`)か資料が確認しているもの: `.scene-trailer` `.scene-handout` `.scene-cast` `.scene-data` `.scene-end` `.scene-progress`、`.poster-v2-nav`・`__item`、`__act-overview`・`-label`・`-copy`、`__overview-intro`・`-label`、`__trailer-definition`、`.cinematic-trailer-band`、`.showcase-cast-entry-pending`・`-reveal`。「確証が弱い」(35)= 名前がどこにもないだけのもの。2026-10-27 までに、js/・全HTML・scripts/・supabase/・config/・assets/・属性セレクタ・他のCSS・テスト・資料・git 履歴まで確かめ、すべて別PRで削除した(`.showcase-published-background-restored` は、これを読む規則をテストが検査していたので、同じ規則の生きているセレクタ側を見るようテストを直した)。確証が弱いまま残るものはない
- 集計はクラス名による機械的な振り分けなので、数件程度の誤差がある(例: 最終ボードの `.poster-v2-handout-*` を含むセレクタ群は4と7の両方に数えたものがある)。集計スクリプトはリポジトリに置いていない(コードを変えない調査のため)。上の規則で再生成できる。
