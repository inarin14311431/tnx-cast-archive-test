# PC／モバイル共通化候補 人手レビュー

## 結論

PC版／モバイル版を画面単位で統合する必要はない。
共通化対象は以下に限定するのが安全。

- URL・遷移先の解釈などの純粋ロジック
- Supabaseへの同一CRUD処理
- 保存payload生成・正規化・初期値生成などの業務ルール
- 日付整形などの小さな純粋utility

一方、DOM取得・表示更新・ボタン状態・モバイル固有イベント制御は各UI側に残す。

---

## 1. すでに共通化済みの重要領域

### 新規キャストの技能初期値

モバイル側 `sheet-mobile-new-character-state.js` は、PC側でも利用する共通ロジック `sheet-new-character-state.js` の `buildNewCharacterSkills()` を利用している。
さらに保存payloadも `sheet-save-payload.js` の `buildSkillSavePayloads()` を利用している。

したがって、新規作成時の一般技能・社会・コネ初期値および保存payloadについては、すでに共通core化されている。

**判断:** 新たな統合作業は不要。回帰テストで維持する。

推奨テスト:

- PC／モバイルで同じ新規技能セットが生成される
- 一般技能master行が同一になる
- blank slot数が同一になる
- 社会／コネ初期行が同一になる
- 保存payloadが同一になる

---

## 2. 優先度A: Navigation Context

対象:

- `js/sheet-navigation-context.js`
- `js/sheet-mobile-navigation-context.js`

重複している純粋ロジック:

- `parseReturnDestination()`
- `toLocalHref()`
- `parentReturnHref()`
- return先ページの許可判定
- `DEFAULT_RETURN`

UI固有差分:

- PCは表示ラベルを2段で持つ
- Mobileは `aria-label` 用の単一ラベルを持つ
- PCは保存後にURLを書き換える
- Mobileはview/PCリンクをclick時にcontextualizeする

### 推奨

`sheet-navigation-core.js` のような純粋moduleを作り、以下のみ共通化する。

- 許可return page一覧
- URL parse / same-origin検証
- local href変換
- default return解決

DOM更新関数はPC／Mobileそれぞれに残す。

**効果:** 小規模・低リスクで、実際に完全一致コードが存在するため最初の共通化対象に適する。

---

## 3. 優先度A: Snapshot DB Service

対象:

- `js/sheet-snapshots.js`
- `js/sheet-mobile-snapshots.js`

両者でほぼ同じDB処理を個別実装している。

共通化可能:

- `character_snapshots` 一覧取得
- `create_character_snapshot` RPC
- `restore_character_snapshot` RPC
- snapshot削除
- 最大取得件数
- 日付format

PC固有:

- `create_character_snapshot_from_bundle`
- 未保存時の `alert()` と保存ボタンfocus
- PC用HTML rendering

Mobile固有:

- section自動挿入
- mobile save状態の参照
- Mobile用HTML rendering

### 推奨

`sheet-snapshot-service.js` を作り、Supabase CRUD/RPCだけを共通化する。

例:

- `listSnapshots(characterId)`
- `createSnapshot(characterId, label)`
- `createBundleSnapshot(characterId, data, label)`
- `restoreSnapshot(snapshotId)`
- `deleteSnapshot(snapshotId)`

dirty判定・confirm・message・DOM描画はserviceへ入れない。

**効果:** DB仕様変更時のPC／Mobile片側修正漏れを防ぎやすい。

---

## 4. 優先度B: Public ID / URL Context utility

対象:

- `sheet-image.js#getPublicId()`
- `sheet-mobile-runtime.js#getMobilePublicId()`

実装内容は同一。

### 推奨

Navigation共通化時に `getPublicIdFromLocation()` も同じ小規模utilityへ寄せることを検討する。

ただし `sheet-mobile-runtime.js` 全体は認証＋character取得cacheを担うため、PC runtimeとの大規模統合は行わない。

---

## 5. 当面共通化しない: Save Coordinator

対象:

- `js/sheet-save-coordinator.js`
- `js/sheet-mobile-save-coordinator.js`

名前は似ているが責務が異なる。

PC版:

- dirty/saving/pending/changeRevisionを持つ保存state machine
- validate/persist callbackを注入
- 保存中に再変更された場合の再保存制御
- global save requesterとの連携

Mobile版:

- DOM上の保存ボタン制御
- `tnx:mobile-before-save` で複数taskを収集
- Promise完了後にbutton clickをreplay
- Mobile固有status UI制御

### 判断

現時点で無理に一本化するとUI依存が共通coreへ混入する。
保存payloadや初期値など下位層はすでに共通化されているため、Coordinatorは分離維持でよい。

将来、Mobile側にもPCと同等のrevision-based save state machineが必要になった場合だけ再検討する。

---

## 6. 機械解析結果の扱い

自動解析では以下が検出された。

- Navigation Contextに完全一致6行ブロック複数
- `parseReturnDestination()` 約76.8%
- `parentReturnHref()` 100%
- `getPublicId()` / `getMobilePublicId()` 約84.6%
- Snapshot `refresh()` 約80%
- Snapshot list click処理 約77.6%
- `formatDate()` 100%

ただし、関数類似度だけでは業務ルールの共通化済み状態を把握できない。
今回の精読では、モバイル新規技能生成がすでにPC共通moduleをimportしていることを確認した。

また、Git履歴の「PCのみ／Mobileのみ変更」集計はファイル名分類に依存するため参考値とし、共通module変更が両画面へ効くケースは別途考慮する。

---

## 推奨実装順

1. Navigation Contextの純粋ロジック共通化
2. Snapshot Supabase service共通化
3. Public ID取得utilityをNavigation/URL utilityへ統合
4. 新規技能・保存payloadのPC/Mobile同値テストを追加
5. 全テスト実行後、同じ監査workflowを再実行して残存重複を確認

### 今回見送るもの

- PC/Mobile Save Coordinatorの統合
- DOM rendererの統合
- Mobile UI moduleとPC UI moduleの統合
- Supabase schema/RLS変更

---

## 期待する完成形

```text
shared core
  ├─ navigation / URL parsing
  ├─ new-character rules        ← 既にかなり共通化済み
  ├─ save payload               ← 既に共通化済み
  └─ snapshot service

PC adapter
  ├─ PC DOM
  ├─ PC save state
  └─ PC rendering

Mobile adapter
  ├─ Mobile DOM
  ├─ Mobile save event aggregation
  └─ Mobile rendering
```

この構造なら、業務ルールの片側修正漏れを防ぎつつ、PC／MobileそれぞれのUI最適化を維持できる。
