(async () => {
  const WINDOW_NAME_PREFIX = "TNX_CAST_TRANSFER_V1:";
  const FALLBACK_URL = new URL(
    "./tnx-transfer-bookmarklet.js?v=2",
    document.currentScript?.src || location.href
  );

  try {
    if (String(window.name || "").startsWith(WINDOW_NAME_PREFIX)) {
      const transferText = String(window.name).slice(WINDOW_NAME_PREFIX.length);
      window.name = "";
      window.__TNX_TRANSFER_TSV__ = transferText;
    }

    const script = document.createElement("script");
    FALLBACK_URL.searchParams.set("t", Date.now());
    script.src = FALLBACK_URL.href;
    script.onload = () => script.remove();
    script.onerror = () => {
      script.remove();
      alert("転記スクリプトを読み込めませんでした。");
    };
    document.documentElement.append(script);
  } catch (error) {
    console.error("TNX mobile transfer loader failed", error);
    alert(
      `転記スクリプトの準備に失敗しました。\n${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
})();
