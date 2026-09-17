# PC／モバイル共通化候補ロジック一覧

生成日時: 2026-09-17T07:12:35.162Z

## 調査条件

- 対象: `js/` 配下でパスに `sheet` を含む JavaScript
- モバイル判定: パスに `mobile` を含むもの
- PC判定: `sheet` を含み `mobile` を含まないもの
- 関数類似度: 4-token shingle の Jaccard 類似度（同名関数は +0.08 補正）
- 候補閾値: 42%
- 完全一致ブロック: 正規化後 6 行窓

## 対象ファイル

### PC
- `js/cast-quick-sheet-compact.js` — 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/character-sheet-compare-matching.js` — 正規化・変換 / アウトフィット / コンボ/技能
- `js/character-sheet-compare-service.js` — バリデーション / 正規化・変換 / アウトフィット / コンボ/技能
- `js/character-sheet-diff-display.js` — 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/character-sheet-jsonp-canonical.js` — バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/character-sheet-source.js` — Supabase/保存・取得 / バリデーション
- `js/character-sheet-url-import-sync.js` — バリデーション / 初期値・新規作成 / 正規化・変換
- `js/character-sheet-url.js` — バリデーション / 正規化・変換
- `js/quick-sheet-paper-layout.js` — Supabase/保存・取得 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-ability-calculation.js` — 正規化・変換
- `js/sheet-ability-input-snapshot.js` — 正規化・変換
- `js/sheet-ability-save-projection.js` — 正規化・変換
- `js/sheet-baseline-adjustment.js` — 正規化・変換 / コンボ/技能
- `js/sheet-birthplace.js` — Supabase/保存・取得 / dirty/未保存判定 / バリデーション / 初期値・新規作成 / 正規化・変換
- `js/sheet-character-input-snapshot.js` — バリデーション / 正規化・変換
- `js/sheet-character-renderer.js` — Supabase/保存・取得 / コンボ/技能
- `js/sheet-character-sheet-compare.js` — Supabase/保存・取得 / バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-combos.js` — Supabase/保存・取得 / バリデーション / 初期値・新規作成 / 正規化・変換 / コンボ/技能
- `js/sheet-editor-interactions.js` — dirty/未保存判定 / 初期値・新規作成 / コンボ/技能
- `js/sheet-error-message.js` — Supabase/保存・取得 / dirty/未保存判定 / バリデーション
- `js/sheet-experience-rules.js` — 初期値・新規作成 / 正規化・変換 / コンボ/技能
- `js/sheet-features.js` — バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-general-column.js` — 初期値・新規作成 / 正規化・変換 / コンボ/技能
- `js/sheet-general-skill-state.js` — バリデーション / 正規化・変換 / コンボ/技能
- `js/sheet-image.js` — Supabase/保存・取得 / dirty/未保存判定 / バリデーション / 初期値・新規作成 / 正規化・変換 / 画像 / コンボ/技能
- `js/sheet-import-outfit-compat.js` — バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット
- `js/sheet-import-specialized-cleanup.js` — 初期値・新規作成 / 正規化・変換 / コンボ/技能
- `js/sheet-import-style-skill-compat.js` — バリデーション / 正規化・変換 / コンボ/技能
- `js/sheet-import-url.js` — バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-import.js` — バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-load-normalization.js` — 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-load-persistence.js` — Supabase/保存・取得 / バリデーション / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-master-autofill.js` — Supabase/保存・取得 / バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-master-search-auto-run.js` — 分類なし
- `js/sheet-master-search-bs-tooltips.js` — 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-master-search-enhancements.js` — 初期値・新規作成 / 正規化・変換 / アウトフィット
- `js/sheet-master-search-filters.js` — Supabase/保存・取得 / バリデーション / 初期値・新規作成 / 正規化・変換 / コンボ/技能
- `js/sheet-master-search-ofc-normalize.js` — バリデーション / 正規化・変換 / アウトフィット
- `js/sheet-master-search-result-ui.js` — 分類なし
- `js/sheet-master-search.js` — Supabase/保存・取得 / バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-multiline-fields-v3.js` — Supabase/保存・取得 / バリデーション / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-navigation-context.js` — 初期値・新規作成 / 正規化・変換
- `js/sheet-new-character-state.js` — バリデーション / 初期値・新規作成 / コンボ/技能
- `js/sheet-open-at-top.js` — 初期値・新規作成 / 画像
- `js/sheet-outfit-renderer.js` — 正規化・変換 / アウトフィット
- `js/sheet-personal-data.js` — dirty/未保存判定 / バリデーション / 初期値・新規作成 / 正規化・変換
- `js/sheet-privileged-tools.js` — 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-row-collection-state.js` — 正規化・変換 / アウトフィット
- `js/sheet-row-factory.js` — アウトフィット / コンボ/技能
- `js/sheet-row-interactions.js` — バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-save-coordinator.js` — dirty/未保存判定 / バリデーション
- `js/sheet-save-diagnostics.js` — Supabase/保存・取得 / バリデーション / 正規化・変換
- `js/sheet-save-payload.js` — バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-save-persistence.js` — Supabase/保存・取得 / バリデーション / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-save-state.js` — dirty/未保存判定 / バリデーション / 正規化・変換
- `js/sheet-section-nav.js` — バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-sidebar-actions.js` — dirty/未保存判定 / 初期値・新規作成 / 正規化・変換 / コンボ/技能
- `js/sheet-skill-level-suit-state.js` — バリデーション / 正規化・変換 / コンボ/技能
- `js/sheet-skill-renderer.js` — バリデーション / 初期値・新規作成 / 正規化・変換 / コンボ/技能
- `js/sheet-snapshots.js` — Supabase/保存・取得 / dirty/未保存判定 / バリデーション / 正規化・変換
- `js/sheet-sticky-exp-panel.js` — 初期値・新規作成 / 正規化・変換 / コンボ/技能
- `js/sheet-style-baseline.js` — 正規化・変換 / コンボ/技能
- `js/sheet-style-input-snapshot.js` — Supabase/保存・取得 / コンボ/技能
- `js/sheet-style-interactions.js` — 初期値・新規作成 / コンボ/技能
- `js/sheet-style-presentation.js` — Supabase/保存・取得 / バリデーション / 正規化・変換 / コンボ/技能
- `js/sheet-style-save-projection.js` — Supabase/保存・取得 / 正規化・変換 / コンボ/技能
- `js/sheet-tsv-import.js` — バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet.js` — Supabase/保存・取得 / dirty/未保存判定 / バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能

### モバイル
- `js/sheet-mobile-ability.js` — Supabase/保存・取得 / dirty/未保存判定 / バリデーション / 初期値・新規作成 / 正規化・変換 / コンボ/技能
- `js/sheet-mobile-app.js` — 初期値・新規作成 / 正規化・変換 / アウトフィット / 画像 / コンボ/技能
- `js/sheet-mobile-character-sheet-compare.js` — Supabase/保存・取得 / バリデーション / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-mobile-combos.js` — Supabase/保存・取得 / dirty/未保存判定 / バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-mobile-general-display.js` — 初期値・新規作成 / 正規化・変換 / コンボ/技能
- `js/sheet-mobile-header-exp.js` — Supabase/保存・取得 / dirty/未保存判定 / バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-mobile-image.js` — Supabase/保存・取得 / バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / 画像 / コンボ/技能
- `js/sheet-mobile-import.js` — バリデーション / 初期値・新規作成 / 正規化・変換
- `js/sheet-mobile-initial-general-rules.js` — バリデーション / 初期値・新規作成 / 正規化・変換 / コンボ/技能
- `js/sheet-mobile-navigation-context.js` — 初期値・新規作成 / 正規化・変換
- `js/sheet-mobile-new-character-state.js` — バリデーション / 初期値・新規作成 / コンボ/技能
- `js/sheet-mobile-new.js` — Supabase/保存・取得 / バリデーション / 初期値・新規作成 / 正規化・変換 / コンボ/技能
- `js/sheet-mobile-outfit-model.js` — 初期値・新規作成 / 正規化・変換 / アウトフィット
- `js/sheet-mobile-outfit-ui.js` — dirty/未保存判定 / 初期値・新規作成 / 正規化・変換 / アウトフィット
- `js/sheet-mobile-outfit.js` — Supabase/保存・取得 / dirty/未保存判定 / バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-mobile-profile.js` — 初期値・新規作成 / 正規化・変換 / 画像
- `js/sheet-mobile-runtime.js` — Supabase/保存・取得 / バリデーション / 正規化・変換
- `js/sheet-mobile-save-coordinator.js` — dirty/未保存判定 / バリデーション / 初期値・新規作成
- `js/sheet-mobile-skill-kind-normalizer.js` — Supabase/保存・取得 / バリデーション / 初期値・新規作成 / 正規化・変換 / コンボ/技能
- `js/sheet-mobile-skills.js` — Supabase/保存・取得 / dirty/未保存判定 / バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-mobile-snapshots.js` — Supabase/保存・取得 / dirty/未保存判定 / バリデーション / 初期値・新規作成 / 正規化・変換 / アウトフィット / コンボ/技能
- `js/sheet-mobile-style-normalizer.js` — 正規化・変換 / コンボ/技能
- `js/sheet-mobile-style-skill-actions.js` — コンボ/技能
- `js/sheet-mobile-style.js` — 初期値・新規作成 / 正規化・変換 / コンボ/技能
- `js/sheet-mobile-summary-text.js` — 初期値・新規作成
- `js/sheet-mobile-ui.js` — 初期値・新規作成 / 正規化・変換 / アウトフィット / 画像 / コンボ/技能
- `js/sheet-mobile-ux.js` — 初期値・新規作成 / 正規化・変換 / アウトフィット / 画像 / コンボ/技能
- `js/sheet-mobile.js` — Supabase/保存・取得 / dirty/未保存判定 / バリデーション / 初期値・新規作成 / 正規化・変換

## 関数単位の共通化候補

### 100.0% — `formatDate` ↔ `formatDate`

- PC: `js/sheet-character-sheet-compare.js:122-122` (61 tokens)
- Mobile: `js/sheet-mobile-snapshots.js:8-8` (61 tokens)
- PC責務: 分類なし
- Mobile責務: 分類なし

### 100.0% — `parentReturnHref` ↔ `parentReturnHref`

- PC: `js/sheet-navigation-context.js:37-39` (18 tokens)
- Mobile: `js/sheet-mobile-navigation-context.js:36-38` (18 tokens)
- PC責務: 初期値・新規作成
- Mobile責務: 初期値・新規作成

### 100.0% — `formatDate` ↔ `formatDate`

- PC: `js/sheet-snapshots.js:193-197` (61 tokens)
- Mobile: `js/sheet-mobile-snapshots.js:8-8` (61 tokens)
- PC責務: 分類なし
- Mobile責務: 分類なし

### 84.6% — `getPublicId` ↔ `getMobilePublicId`

- PC: `js/sheet-image.js:66-68` (27 tokens)
- Mobile: `js/sheet-mobile-runtime.js:6-8` (27 tokens)
- PC責務: 正規化・変換
- Mobile責務: 正規化・変換

### 80.0% — `refresh` ↔ `refresh`

- PC: `js/sheet-snapshots.js:68-84` (92 tokens)
- Mobile: `js/sheet-mobile-snapshots.js:10-10` (84 tokens)
- PC責務: Supabase/保存・取得 / バリデーション / 正規化・変換
- Mobile責務: Supabase/保存・取得 / バリデーション

### 77.6% — `handleListClick` ↔ `listClick`

- PC: `js/sheet-snapshots.js:139-166` (191 tokens)
- Mobile: `js/sheet-mobile-snapshots.js:12-12` (202 tokens)
- PC責務: Supabase/保存・取得 / バリデーション
- Mobile責務: Supabase/保存・取得 / dirty/未保存判定 / バリデーション

### 76.8% — `parseReturnDestination` ↔ `parseReturnDestination`

- PC: `js/sheet-navigation-context.js:19-31` (88 tokens)
- Mobile: `js/sheet-mobile-navigation-context.js:19-30` (84 tokens)
- PC責務: 正規化・変換
- Mobile責務: 正規化・変換

### 65.0% — `setMessage` ↔ `message`

- PC: `js/sheet-character-sheet-compare.js:118-118` (37 tokens)
- Mobile: `js/sheet-mobile-snapshots.js:7-7` (35 tokens)
- PC責務: 分類なし
- Mobile責務: 分類なし

### 62.3% — `setActive` ↔ `activate`

- PC: `js/sheet-section-nav.js:16-23` (59 tokens)
- Mobile: `js/sheet-mobile-ux.js:169-176` (59 tokens)
- PC責務: 分類なし
- Mobile責務: 分類なし

### 51.9% — `firstNumber` ↔ `levelFromText`

- PC: `js/sheet-master-search.js:526-529` (40 tokens)
- Mobile: `js/sheet-mobile-header-exp.js:15-15` (48 tokens)
- PC責務: 正規化・変換
- Mobile責務: 分類なし

### 48.0% — `render` ↔ `render`

- PC: `js/sheet-snapshots.js:168-181` (54 tokens)
- Mobile: `js/sheet-mobile-snapshots.js:9-9` (58 tokens)
- PC責務: 正規化・変換
- Mobile責務: 分類なし

## 完全一致コードブロック候補

- PC `js/sheet-navigation-context.js:18-23` ↔ Mobile `js/sheet-mobile-navigation-context.js:18-23`
- PC `js/sheet-navigation-context.js:19-24` ↔ Mobile `js/sheet-mobile-navigation-context.js:19-24`
- PC `js/sheet-navigation-context.js:33-38` ↔ Mobile `js/sheet-mobile-navigation-context.js:32-37`
- PC `js/sheet-navigation-context.js:34-39` ↔ Mobile `js/sheet-mobile-navigation-context.js:33-38`

## 直近200コミットのPC／モバイル分離修正

- PCのみ変更: **2**
- モバイルのみ変更: **0**
- PC／モバイル同時変更: **0**

- PCのみ: `c64e03c230` — `js/sheet-character-sheet-compare.js`
- PCのみ: `3f43b73e0b` — `js/character-sheet-compare-matching.js`, `js/character-sheet-compare-service.js`

## 判定上の注意

- このレポートは機械抽出。DOM操作・表示制御まで共通化すべきとは判断しない。
- 高類似でもUI依存が強い関数は、payload生成・正規化・検証など純粋ロジックだけ切り出す。
- 低類似でも同じ業務ルールを別実装している場合があるため、保存payload・初期値・一般技能・数値/null正規化は人手確認する。
- 次工程では上位候補のみ行範囲指定で取得し、共通core候補／UIに残す処理／見送りに分類する。

