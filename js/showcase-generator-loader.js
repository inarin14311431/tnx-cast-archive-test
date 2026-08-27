function reportRuntimeError(message) {
  const status = document.querySelector("#library-status");
  if (!status) return;
  status.textContent = `キャスト選択エラー：${message}`;
  status.className = "generator-status is-error";
}

function reportOptionalModuleError(name, error) {
  console.error(`Optional showcase module could not be initialized: ${name}`, error);
}

window.addEventListener("error", event => {
  if (event?.message) reportRuntimeError(event.message);
});

window.addEventListener("unhandledrejection", event => {
  const reason = event?.reason;
  reportRuntimeError(reason?.message || String(reason || "初期化に失敗しました。"));
});

try {
  await import("./showcase-generator-v3.js?v=7");
  // 公開処理は必須機能。装飾・補助モジュールより先に、独立して初期化する。
  // 任意モジュールの失敗で旧履歴登録処理へフォールバックしないようにする。
  await import("./showcase-dynamic-publish.js?v=5");
} catch (error) {
  console.error("Showcase generator core could not be initialized.", error);
  reportRuntimeError(error?.message || "初期化に失敗しました。ページを再読み込みしてください。");
}

const optionalModules = [
  ["tagline", "./showcase-tagline.js?v=2"],
  ["tagline-auto", "./showcase-tagline-auto.js?v=1"],
  ["history-role", "./showcase-history-role.js?v=1"]
];

await Promise.all(optionalModules.map(async ([name, source]) => {
  try {
    await import(source);
  } catch (error) {
    reportOptionalModuleError(name, error);
  }
}));

setTimeout(() => {
  const publicStatus = document.querySelector("#library-status");
  const privateStatus = document.querySelector("#private-library-status");
  if (publicStatus?.textContent?.includes("読み込み中") || privateStatus?.textContent?.includes("読み込み中")) {
    reportRuntimeError("キャストの読込みが完了しませんでした。通信状態、ログイン状態、またはSupabaseのcharacters列を確認してください。");
  }
}, 12000);
