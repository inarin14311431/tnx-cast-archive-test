# Test Strategy

このリポジトリのテストは、役割を重ねないことを優先する。

## 1. Core functional tests

`npm run test:core`

日常の実装変更で最初に実行する高速な回帰テスト。以下を担当する。

- 保存・読込・正規化・データマッピング
- OFC、インポート、互換処理
- 能力値・経験点などの計算ルール
- 行追加・削除・並べ替えなどの状態遷移
- モジュール境界、DOM ownership、初期化契約
- Supabase入出力のローカル契約
- テーマのマニフェスト、トークン、コントラストなど構造上の保証

見た目だけを理由にCoreテストを追加しない。

## 2. Presentation contract tests

`npm run test:presentation`

CSSやレイアウトについて、スクリーンショットだけでは意図を判定しにくい最低限の契約を担当する。

- hover / focus-visible の存在
- タッチターゲット
- レスポンシブ構造
- 重要な列幅・コンパクト表示の契約
- 読みやすさに関する最低条件

ここでは「特定の色・余白・装飾が見た目として正しいか」を増やさない。最終的な描画結果はVisual Regressionに任せる。

## 3. Visual Regression

`npm run visual`

Playwrightの基準画像との差分で、最終的な見た目を担当する。

- 配置ずれ
- 色、背景、枠、影、装飾
- テーマ適用漏れ
- 文字・セル・カードの見切れ
- PC / mobile の描画崩れ

意図した変更でのみ `npm run visual:update` を使う。差分を確認せず基準画像を更新しない。

## 4. E2E

`npm run e2e`

複数画面をまたぐ操作やブラウザ上の実動作を担当する。単純な関数・変換ルールはNodeテスト側で確認し、E2Eへ重複実装しない。

## 5. Full verification

`npm run verify`

リリース前の総合確認。各種auditと全Nodeテストを実行する。Visual RegressionとE2Eは目的が異なるため別コマンドのまま維持する。

## 運用ルール

1. データ・計算・保存・互換性の不具合はCoreへ追加する。
2. CSSの完成形の不具合は、原則Visual Regressionの基準画像で守る。
3. CSSの契約テストは、スクリーンショットでは検知しづらい意味的条件だけにする。
4. 同じ不具合をCore、Presentation、Visual、E2Eの4箇所すべてで再現しない。
5. 過去不具合の個別テストは、一般化されたテストで同じ原因を確実に検出できるようになった時点で統合・削除する。
6. `*-regression.test.mjs` を増やす前に、既存の担当テストへケース追加できないか確認する。

## 日常の推奨順序

```text
npm run test:core
  ↓
変更領域に応じて npm run test:presentation / npm run visual / npm run e2e
  ↓
リリース前 npm run verify
```

これにより、普段の修正では機能回帰を短く回し、見た目の確認はVisual Regressionへ集約しつつ、リリース前には従来の検出力を維持する。
