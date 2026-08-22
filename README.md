# トーキョーN◎VA CAST ARCHIVE

トーキョーN◎VAのキャスト情報を登録・編集・閲覧し、セッション運用に必要な情報を一元管理するWebアプリです。

このリポジトリは検証環境です。本番へ直接変更を入れず、原則としてこの環境で実装・自動テスト・実画面確認を行った後に本番へ昇格します。

## 主な機能

- キャスト一覧・公開閲覧
- PC編集・モバイル編集
- スタイル、一般技能、社会、コネ、スタイル技能の管理
- 武器、防具、サイバーウェア、ヴィークル等のアウトフィット管理
- コンボ／技能カウンター
- 経験点計算・履歴
- 参加アクト管理
- SKD / OFC検索・取込
- 外部キャラクターシートからの取込・転記
- ココフォリア／ユドナリウム等への出力
- バックアップ／復元
- 複数テーマ

## 技術構成

- HTML / CSS / JavaScript
- Supabase
- GitHub Pages
- Node.js 22
- Playwright
- GitHub Actions

CSSは `css-next/` を現行系とし、旧CSSやJavaScriptによる実行時CSS生成には戻しません。

## 主要ディレクトリ

- `css-next/` — 現行CSS。共通トークン、コンポーネント、編集画面、ページ固有CSS
- `js/` — UI、データ処理、Supabase、取込・転記等のJavaScript
- `tests/` — Node回帰テスト
- `tests/e2e/` — Playwright E2E / Visual Regression
- `scripts/` — 構文、依存関係、runtime integrity、DOM ownership等の監査
- `.github/workflows/` — CI

CSS再構築の詳細な経緯は `CSS_REBUILD_README.md` を参照してください。

## 開発時の基本ルール

1. 本番へ直接実装しない。
2. 検証環境で作業ブランチを作成する。
3. 変更後に `npm run verify` を通す。
4. 関係するE2Eを実行する。
5. 見た目を変更した場合はVisual Regressionを確認する。
6. PRで検証環境 `main` に統合する。
7. 実画面で問題がないことを確認してから本番へ昇格する。

HTML / CSS / JavaScriptは、人間が追跡できる改行・インデントを維持してください。圧縮した1行コードをソースとして保存しない方針です。

## セットアップ

```bash
npm install
npx playwright install chromium
```

認証を伴うE2Eでは以下の環境変数を使用します。

- `E2E_EMAIL`
- `E2E_PASSWORD`
- `E2E_CAST_ID`

実値はリポジトリへコミットせず、GitHub Actions Secretsまたはローカル環境変数で管理します。

## 品質確認

### 静的監査・回帰テスト

```bash
npm run verify
```

このコマンドはJavaScript構文、モジュール依存、runtime integrity、PC編集、公開閲覧、モバイル編集、DOM ownership、Node回帰テストをまとめて確認します。

### E2E

```bash
npm run e2e
```

CIでは公開／Smoke、認証済みPC編集、モバイルを分離して実行します。

### Visual Regression

```bash
npm run visual
```

基準画像を意図的に更新する場合だけ次を使用します。

```bash
npm run visual:update
```

基準画像の更新は「テストを通すため」に行わず、画面変更が仕様として正しいことを確認した場合だけコミットします。

Visual Regressionはまず以下を重点監視します。

- 公開キャスト閲覧画面
- 代表的なダーク／ライトテーマ
- アカウント画面
- PC編集画面

アニメーションとtransitionは撮影時に無効化し、動的演出による不要な差分を抑えます。

## CIの判定

PRをマージする前に、少なくとも以下が成功していることを確認します。

- Regression checks
- Public and smoke E2E
- Authenticated editor E2E
- Mobile E2E
- Visual regression

失敗した場合はPlaywright artifactのレポートと `test-results` の差分画像を確認します。

## テーマ変更時の確認

テーマを変更した場合は、アクセント色だけでなく次を横断確認します。

- 通常文字／補助文字
- placeholder
- hover / focus-visible
- disabled
- 選択状態
- アクセント背景上の文字
- 警告／危険操作
- PC閲覧／PC編集／モバイル閲覧／モバイル編集

補助文字の視認性を `opacity` だけで調整しないことを基本とし、意味的なテーマトークンを優先します。

## 本番反映

検証環境の変更を本番へ反映するときは、検証環境で成功した変更だけを対象にします。

本番反映後は最低限、キャスト一覧、キャスト閲覧、PC編集、モバイル編集、アカウント画面を確認します。

## 障害時

1. 直近のPRとコミットを特定する。
2. GitHub ActionsのRegression / E2E結果を確認する。
3. データ破損が疑われる場合はUI修正より先に保存・読込経路を確認する。
4. 見た目だけの問題では、データ処理へ変更を入れない。
5. 本番で緊急修正した場合も、検証環境へ同じ変更を戻して差分を残さない。

## セキュリティ・秘密情報

Supabaseキー、E2Eアカウント、パスワード等の秘密情報をソースコード、README、Issue、PR本文へ記載しません。GitHub Secrets等で管理します。
