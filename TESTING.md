# Test Strategy

このリポジトリでは、テスト時間の短縮よりも機能追加・デザイン変更時の安全性を優先する。テストの役割は整理するが、標準確認の範囲は縮小しない。

## 1. Core functional tests

`npm run test:core`

機能ロジックの高速な部分確認用。以下を担当する。

- 保存・読込・正規化・データマッピング
- OFC、インポート、互換処理
- 能力値・経験点などの計算ルール
- 行追加・削除・並べ替えなどの状態遷移
- モジュール境界、DOM ownership、初期化契約
- Supabase入出力のローカル契約
- テーマのマニフェスト、トークン、コントラストなど構造上の保証

`test:core` は開発途中の素早い確認用であり、変更完了時の標準確認には使用しない。

## 2. Presentation contract tests

`npm run test:presentation`

CSSやレイアウトについて、スクリーンショットだけでは意図を判定しにくい契約を担当する。

- hover / focus-visible の存在
- タッチターゲット
- レスポンシブ構造
- 重要な列幅・コンパクト表示の契約
- 読みやすさに関する最低条件

最終的な描画結果はVisual Regressionでも確認する。

## 3. Node regression tests

`npm test`

標準のNode回帰テスト。CoreとPresentationを含む全Nodeテストを実行する。機能追加・修正・デザイン変更の完了時は、軽量版ではなくこちらを基準とする。

## 4. Visual Regression

`npm run visual`

Playwrightの基準画像との差分で最終的な見た目を確認する。

- 配置ずれ
- 色、背景、枠、影、装飾
- テーマ適用漏れ
- 文字・セル・カードの見切れ
- PC / mobile の描画崩れ

意図した変更でのみ `npm run visual:update` を使う。差分を確認せず基準画像を更新しない。

## 5. E2E

`npm run e2e`

複数画面をまたぐ操作やブラウザ上の実動作を担当する。保存・再読込・編集フロー・モバイル操作などを実環境に近い形で確認する。

## 6. Full verification

`npm run verify`

JavaScript、モジュール構造、runtime、CSS、テーマ、セキュリティ、DOM ownership、全Nodeテストをまとめて確認する標準ゲート。

GitHub Pull Requestでは、さらに別WorkflowでE2EとVisual Regressionも必ず実行する。したがって変更をmainへ入れる前の標準安全ゲートは次の3系統になる。

1. Regression checks: `npm run verify`
2. Playwright E2E
3. Visual Regression

## 運用ルール

1. 機能追加・仕様変更・デザイン変更の完了時は、全Node回帰・E2E・Visual Regressionを省略しない。
2. `test:core` や `test:presentation` 単独実行は開発途中の部分確認に限定する。
3. データ・計算・保存・互換性の不具合はCoreへ追加する。
4. CSSの完成形の不具合はVisual Regressionでも守る。
5. CSS契約テストは、スクリーンショットでは検知しづらい意味的条件を残す。
6. 同一原因のテストは役割を整理するが、異なる検出層による防御は安易に削らない。
7. 過去不具合の個別テストは、一般化されたテストで同じ原因を確実に検出できることを確認してから統合・削除する。
8. `*-regression.test.mjs` を増やす前に、既存の担当テストへケース追加できないか確認する。

## 推奨フロー

```text
実装途中
  npm run test:core / npm run test:presentation

変更完了
  npm test
  npm run verify

Pull Request
  Regression checks + Playwright E2E + Visual Regression をすべて成功させる
```

テスト時間が多少増えても、機能・データ・デザインの回帰を複数層で検出できる状態を維持する。
