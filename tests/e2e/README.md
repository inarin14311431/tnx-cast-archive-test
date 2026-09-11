# Playwright E2E

このディレクトリは、ローカルとGitHub Actionsで同じPlaywrightテストを実行するための一式です。

## 初回セットアップ（Windows / PowerShell）

```powershell
git pull
npm.cmd install
npx.cmd playwright install chromium
```

PowerShellのExecution Policyで `npm.ps1` / `npx.ps1` が拒否される環境では、必ず `npm.cmd` / `npx.cmd` を使用します。

## 認証が必要なテスト

認証情報はコードへ保存しません。PowerShellセッションへ環境変数として設定します。

```powershell
$env:E2E_EMAIL="テスト用メールアドレス"
$env:E2E_PASSWORD="テスト用パスワード"
$env:E2E_CAST_ID="TNX-000091"
$env:E2E_TROOP_ID="TRP-56F796299BEC"
```

`E2E_EMAIL` / `E2E_PASSWORD` が未設定の場合、認証必須テストは失敗ではなくskipになります。`E2E_CAST_ID` は未設定時に `TNX-000091` を使用します。
`E2E_TROOP_ID` は公開閲覧テスト用で、未設定時は `TRP-56F796299BEC` を使用します。

旧ローカル環境との互換用に `TEST_EMAIL` / `TEST_PASSWORD` / `TEST_CAST_ID` も利用できます。

## 実行グループ

E2Eの正規分類は `tests/e2e/test-suites.json` で一元管理します。新しい `.spec.js` は必ずいずれかのグループへ追加します。`npm run audit:e2e` が未分類・存在しないspec参照・CI実行漏れを検出します。

- `ci-public`: PRごとに実行する公開画面・smoke。実DBへの意図的な書込みは行わない。
- `ci-editor`: PRごとに実行する認証編集画面。SKDマスタ検索を含み、意図的なlive-writeは行わない。
- `ci-mobile`: PRごとに実行するモバイル回帰。
- `live-write`: 承認済みテスト所有者の実DBへ書込み・復元まで行う高コスト確認。通常PR CIから分離する。
- `manual-ui`: 過去の個別UI不具合を狙った詳細回帰。通常CIではなく、関連箇所を変更したときに限定実行する。

```powershell
npm.cmd run e2e:ci-public
npm.cmd run e2e:ci-editor
npm.cmd run e2e:ci-mobile
npm.cmd run e2e:live-write
npm.cmd run e2e:manual-ui
```

全specをまとめて確認する場合は従来どおり次を使用できます。

```powershell
npx.cmd playwright test
```

ブラウザを表示する場合:

```powershell
npx.cmd playwright test --headed
```

特定テストのみ:

```powershell
npx.cmd playwright test tests/e2e/editor-help.spec.js --project=chromium --headed
```

トループ関連のみ:

```powershell
npm.cmd run test:troop
npm.cmd run e2e:troop
```

HTMLレポート:

```powershell
npx.cmd playwright show-report
```

## テスト方針

- 同じ仕様を複数のE2Eで重複確認しない。構造・契約はNode/static audit、操作連携はE2E、見た目はVisual Regressionを優先する。
- OS差が出やすいページ全体の画像比較を通常E2Eの主判定にしない。
- レイアウトはDOMの寸法、grid列数、横スクロール有無で検査する。
- 認証情報は実行時に生成した `playwright/.auth/user.json` のみへ保存する。
- `playwright/.auth/`, `test-results/`, `playwright-report/` はGit管理しない。
- 個別不具合向けの詳細UIテストは削除せず `manual-ui` に保持し、通常CI時間を増やさない。
- live-writeテストは通常CIと分離し、必要時のみ明示実行する。

## GitHub Actions

`.github/workflows/playwright.yml` は `ci-public` / `ci-editor` / `ci-mobile` の3グループだけを実行します。workflowへ個別 `.spec.js` を直接列挙せず、manifest-backed npm scriptsを呼び出します。

認証必須テストもCIで実行する場合、Repository Settings > Secrets and variables > Actions に以下を登録します。

- `E2E_EMAIL`
- `E2E_PASSWORD`
- `E2E_CAST_ID`
- `E2E_TROOP_ID`

Secretsが未登録でも公開画面のテストは実行され、認証必須テストはskipされます。

## Approved test scope (2026-09-06)

Live test casts are limited to the approved test-owner account. `owner-policy.js` fixes the verified UID; environment variables cannot override it. `safe-test.js` checks the session with Auth, queries cast ownership before use, filters cast reads, and blocks unscoped or unrelated mutations at the network boundary. Synthetic mocked tests do not write to the shared DB.

Set `E2E_REQUIRE_AUTH=1` for required authenticated runs; missing credentials must fail rather than look successful through skips. GitHub concurrency does not coordinate another repository: do not run production write tests concurrently until the same coordination policy is applied there.

Live-write save tests restore their edited values in `finally`. Forced cancellation can bypass that cleanup: do not cancel a running write test. Before running live-write tests, retain a recovery snapshot of the selected cast. Do not restore over unrelated newer user changes.
