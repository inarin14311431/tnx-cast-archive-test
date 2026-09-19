# 現在地 / Current State

最終更新: 2026-09-19

この文書は、AIや新規担当者が「何が完了済みで、何が途中か」を誤認しないためのスナップショットである。時点情報なので、作業再開時はGitHub上のmain/PR/branchを再確認すること。

## 1. Runtime同期FIX基準点

### 検証repo

- Repository: `inarin14311431/tnx-cast-archive-test`
- runtime基準: `4e333f5193c91bc90a03db1449cd8f5948d25944`

### 本番repo

- Repository: `inarin14311431/tnx_cast_list`
- runtime基準: `7f2d202459a8dedd442642ce8819379083615a47`

本番側の上記commitは、検証PR #374 / `4e333f5` までのruntimeを同期したFIX点として記録されている。共有Supabase/DB変更は含まれていない。

これらは **runtime/applicationの同期基準** であり、設計資料やREADMEだけのcommitによって各repoのmain SHAはその後進む。最新main SHAを固定値としてこの文書に持たない。作業開始時にGitHubから取得すること。

## 2. 直近で完了済みの基準状態

検証と本番は、ACT SHOWCASE専用テーマ、表示契約、ACT TRAILER関連修正と、それらに対応する回帰/E2E変更を含むruntime状態まで同期済み。

これはテスト・CI構成全体の同期完了を意味しない。2026-09-17の照合では、アプリruntimeのファイルは一致する一方、npm scripts、E2E分類runner、一部spec、workflowには環境差がある。本番には検証専用の `e2e:ci-*` / `e2e:live-write` / `audit:e2e` が未導入で、既存CIには `audit-coverage.spec.js` の保存・原状復帰テストが含まれる。

詳細は [`TESTING_STRATEGY.md` 第6節](TESTING_STRATEGY.md#6-playwright-e2e分類)。引き継ぎ資料の同期とテスト構成の同期を別の作業として扱い、共通化実装の保留は維持する。

このFIX点以前の中途半端なPR/branchを現在仕様より優先しない。

## 3. PC/Mobile共通化: Navigation完了、Snapshot共通化待ち

Navigation(戻り先URL解決)の共通化は完了した。Snapshot Supabase serviceとPublic ID/小さいURL utilityの共通化は未着手で、次のPR候補として残っている。

### Navigation共通化(完了、2026-09-19)

- 共有コア: `js/sheet-navigation-core.js`(UI非依存の純粋関数のみ)
  - データ: `RETURN_DESTINATIONS`(許可ページごとのPC label/en label/Mobile aria-label)、`PARENT_RETURN_PAGES`、`DEFAULT_RETURN_HREF`
  - 関数: `readTrimmedSearchParam`、`toLocalHref`、`parseReturnDestination`、`resolveParentReturnHref`
- PC adapter: `js/sheet-navigation-context.js`。UI側の責務(headerラベル更新、view linkのDOM更新、save後のhistory操作、click/MutationObserver配線)はこのファイルに残置。
- Mobile adapter: `js/sheet-mobile-navigation-context.js`。UI側の責務(aria-label更新、forwardリンクのcontextualize、click配線)はこのファイルに残置。
- `js/mobile-editor-route.js` も同じcoreへ切替済み。classic script(`type="module"`ではない)のため、`sheet-open-at-top.js`と同じ動的`import("./sheet-navigation-core.js?v=1")`パターンで読み込む。
- 契約テスト:
  - `tests/sheet-navigation-core.test.mjs`: pure core自体の挙動(same-origin検証、許可ページ判定、default解決)と、PC/Mobile同値contract(同じ`return`値に対してPC・Mobile双方が同じhrefへ解決すること)。
  - `tests/navigation-return-context-contract.test.mjs`: 各adapterの配線(どのファイルがcoreをimportしているか、UI更新ロジックが残っているか)。

追加確認: `js/cast-ui.js` にも同種の重複ロジック(`PARENT_RETURN_PAGES`、`parseReturnDestination`、`parentReturnHref`相当)が存在する。今回のスコープには含めていない。次に着手する場合の候補として記録する。

### `refactor/navigation-shared-core`(旧branch、未使用のまま)

このbranchはruntime基準 `4e333f5` から作成されたが、その後実装が進まなかった。2026-09-19時点でも最新mainとの差分はruntime変更0件のまま。Navigationの実装は、このbranchを再利用せず最新mainから新規に切った `feat/navigation-shared-core` で行った。今後不要なら削除を検討してよい。

### `audit/pc-mobile-commonization`

調査専用branch。

追加したもの:

- 共通化候補を抽出するaudit script
- audit用GitHub Actions workflow
- 機械解析report
- 人手review report

runtimeアプリの共通化実装branchではない。

### Snapshot共通化(未着手)

安全な方向は第7節を参照。Navigation完了後の次のPR候補。

### Public ID / 小さいURL utility共通化(未着手)

Snapshot完了後の次のPR候補。

## 4. 共通化調査の結論

### 既に共通化されている重要領域

- `sheet-new-character-state.js` / `sheet-save-payload.js`: Mobile新規キャスト技能生成が利用。新規技能初期値・保存payloadは「今後初めて共通化する領域」ではない。今後は同値回帰テストを維持する。
- `sheet-navigation-core.js`: PC (`sheet-navigation-context.js`)、Mobile (`sheet-mobile-navigation-context.js`)、`mobile-editor-route.js` の3箇所が利用する戻り先URL解決ロジック(許可ページ集合、same-origin検証、parse、URL→local href変換、デフォルト解決、query utility)。今後は `tests/sheet-navigation-core.test.mjs` の同値契約テストを維持する。

### 優先候補

1. Snapshot Supabase service
2. Public ID / small URL utility
3. PC/Mobile同値contract testの強化(Navigationについては対応済み。他領域は今後追加)

### 現時点で統合しないもの

- `sheet-save-coordinator.js`
- `sheet-mobile-save-coordinator.js`

理由: 名前は似ているが責務が異なる。

PC側はdirty/saving/pending/revisionを持つsave state machine。
Mobile側はDOM保存ボタンと `tnx:mobile-before-save` のtask aggregationが中心。

無理に統合するとUI依存がshared coreへ入る。

## 5. Navigation共通化で確認した対象範囲(完了)

共通化候補は当初想定の2ファイルだけではなく、以下3ファイルだった。

- `js/sheet-navigation-context.js`
- `js/sheet-mobile-navigation-context.js`
- `js/mobile-editor-route.js`

`mobile-editor-route.js` にもallowed return page、same-origin、local href生成の類似処理があり、3箇所とも `js/sheet-navigation-core.js` へ切替済み。

なお `js/cast-ui.js` にも同種の重複ロジックがあることを追加確認したが、今回のスコープには含めていない(第3節参照)。

## 6. Navigation共通化で実装した内容

shared core (`js/sheet-navigation-core.js`) に含めたもの:

- allowed return page set (`RETURN_DESTINATIONS` / `PARENT_RETURN_PAGES`)
- same-origin return validation (`parseReturnDestination`内)
- return URL parse (`parseReturnDestination`)
- URL → local href (`toLocalHref`)
- default return解決 (`resolveParentReturnHref` + `DEFAULT_RETURN_HREF`。`mobile-editor-route.js`はページ文脈依存のfallbackを呼び出し側で指定)
- public ID等の小さいquery utility (`readTrimmedSearchParam`)

UI側(各adapterファイル)へ残したもの:

- PC headerのlabel更新
- Mobile `aria-label`
- view/PC/MobileリンクのDOM更新
- save後のhistory操作
- click event wiring

## 7. Snapshot共通化の安全な方向

shared service候補:

- `listSnapshots(characterId)`
- `createSnapshot(characterId, label)`
- `createBundleSnapshot(characterId, data, label)`
- `restoreSnapshot(snapshotId)`
- `deleteSnapshot(snapshotId)`

UIへ残す:

- dirty判定
- confirm
- alert/focus
- message
- PC/Mobile render
- section injection

## 8. 監査方式

repo全体をAIセッションへ大量取得するとtimeoutしやすいため、今後の大規模監査では以下を推奨する。

1. GitHub Actionsでrepoをcheckout
2. audit scriptで構造/重複候補を抽出
3. Markdown reportを生成
4. AIは上位候補だけ行範囲指定で読む
5. 人手/AIレビューで責務を判定

全文一括取得を標準調査方法にしない。

## 9. 次に共通化を再開する場合(Snapshot)

Navigation共通化は第3〜6節の手順で完了した(2026-09-19)。次に着手する場合はSnapshot Supabase serviceを対象とする。推奨順:

1. 最新mainを再確認
2. Snapshot関連ファイル(PC/Mobileの一覧・作成・復元・削除呼び出し箇所)を再取得
3. pure core APIを先にテストで定義
4. shared service module追加
5. PC adapter切替
6. Mobile adapter切替
7. Node test + 関連audit(`audit:modules`など)
8. `npm run verify`
9. `ci-editor` + `ci-mobile`
10. 検証PR

Public ID / 小さいURL utilityの共通化はSnapshot完了後に別PRとする。

## 10. 現在優先して守るべき資料

- `docs/AI_HANDOFF.md`
- `docs/DESIGN_PRINCIPLES.md`
- `docs/ARCHITECTURE_OVERVIEW.md`
- `docs/TESTING_STRATEGY.md`
- `docs/CHANGE_MANAGEMENT.md`
- `docs/OUTFIT_DATA_ARCHITECTURE.md`
- `docs/DATABASE_MIGRATIONS.md`
- `docs/CSS_ARCHITECTURE.md`
- `docs/THEME_SYSTEM.md`
- `tests/e2e/README.md`

本資料と実コードが食い違った場合は、最新mainのコード・test・migration・workflowを確認し、必要なら本資料を更新する。
